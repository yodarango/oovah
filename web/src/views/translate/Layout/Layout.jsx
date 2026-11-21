import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button, Modal, TextArea } from "@ds";
import { usePost } from "@utils";
import { useAppContext } from "../../context/appContextProvider";
import { API_GET_CONVERSATION, API_POST_GRAMMAR, API_POST_TRANSLATE } from "@constants";

// styles
import "./Layout.css";

const LANGUAGES = [
  { code: "English", flag: "🇺🇸", name: "English" },
  { code: "Spanish", flag: "🇲🇽", name: "Spanish" },
  { code: "Italian", flag: "🇮🇹", name: "Italian" },
  { code: "German", flag: "🇩🇪", name: "German" },
  { code: "Greek", flag: "🇬🇷", name: "Greek" },
];

const getInitialQuestionText = (targetLanguage, sourceText, translatedText) => {
  switch (targetLanguage) {
    case "Spanish":
      return `Sobre la palabra "${sourceText}" que se traduce como "${translatedText}" al español. `;
    case "Italian":
      return `Sulla parola "${sourceText}" che si traduce come "${translatedText}" in italiano. `;
    case "German":
      return `Zum Wort "${sourceText}", das als "${translatedText}" ins Deutsche übersetzt wird. `;
    case "Greek":
      return `Σχετικά με τη λέξη "${sourceText}" που μεταφράζεται ως "${translatedText}" στα ελληνικά. `;
    case "English":
    default:
      return `About the word "${sourceText}" which translates as "${translatedText}" into English. `;
  }
};

// The existing project does not use runtime prop types for view components.
// eslint-disable-next-line react/prop-types
export const Layout = ({ result = null }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useAppContext();

  const [conversation, setConversation] = useState(result);
  const [messages, setMessages] = useState(result?.messages || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [translatingTo, setTranslatingTo] = useState(null);
  const [alternateResult, setAlternateResult] = useState(null);
  const [grammar, setGrammar] = useState(null);

  const {
    post: postQuestion,
    loading: chatLoading,
    error: chatError,
  } = usePost({
    url: API_POST_TRANSLATE,
    callback: (data) => {
      if (!data?.conversationId) return;
      setIsChatModalOpen(false);
      navigate(`/conversation/${data.conversationId}`);
    },
  });

  const {
    post: postAlternateTranslation,
    loading: alternateTranslationLoading,
    error: alternateTranslationError,
  } = usePost({
    url: API_POST_TRANSLATE,
    callback: (data, request) => {
      setTranslatingTo(null);
      if (!data?.conversationId) return;
      setAlternateResult({
        id: data.conversationId,
        type: "translation",
        source: request.source,
        target: request.target,
        messages: [
          { role: "user", content: request.text },
          { role: "assistant", content: data.translation },
        ],
      });
    },
  });

  useEffect(() => {
    const actionError = chatError || alternateTranslationError;
    if (!actionError) return;

    setTranslatingTo(null);
    showToast({ type: "danger", message: String(actionError), zIndex: 100 });
    // showToast is recreated when toast state changes; only react to new errors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatError, alternateTranslationError]);

  useEffect(() => {
    if (result || !id) return;

    const fetchConversation = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_GET_CONVERSATION}${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("auth"),
          },
        });
        const result = await response.json();
        if (result.success && result.data) {
          const conversationData = result.data;
          setConversation(conversationData);
          setMessages(conversationData.messages || []);
        } else if (result.errors) {
          setError(result.errors);
        }
      } catch {
        setError("Failed to load translation.");
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [id, result]);

  const sourceText = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const translatedText = [...messages].reverse().find((m) => m.role === "assistant")?.content || "";

  useEffect(() => {
    if (result || conversation?.type !== "translation" || !sourceText || !translatedText) return;
    const controller = new AbortController();
    setGrammar(null);
    fetch(API_POST_GRAMMAR, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("auth"),
      },
      body: JSON.stringify({ source: conversation.source, target: conversation.target, text: sourceText, translation: translatedText }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((response) => { if (response.success) setGrammar(response.data); })
      .catch((err) => { if (err.name !== "AbortError") console.error("Failed to load grammar:", err); });
    return () => controller.abort();
  }, [result, conversation, sourceText, translatedText]);

  if (loading) {
    return <p className='translate-page-layout-56yl__empty'>Loading...</p>;
  }

  if (error) {
    return (
      <p className='color-danger translate-page-layout-56yl__empty'>{error}</p>
    );
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const sourceFlag = conversation?.source
    ? LANGUAGES.find((lang) => lang.code === conversation.source)?.flag
    : null;

  const targetFlag = conversation?.source
    ? LANGUAGES.find((lang) => lang.code === conversation.target)?.flag
    : null;

  const hasTranslation = Boolean(
    conversation?.type === "translation" &&
      conversation?.source &&
      conversation?.target &&
      sourceText &&
      translatedText,
  );
  const alternateLanguages = hasTranslation
    ? LANGUAGES.filter(
        (lang) =>
          lang.code !== conversation.source && lang.code !== conversation.target,
      )
    : [];
  const initialQuestionText = hasTranslation
    ? getInitialQuestionText(conversation.target, sourceText, translatedText)
    : "";

  const handleOpenChatModal = () => {
    setQuestionText(initialQuestionText);
    setIsChatModalOpen(true);
  };

  const handleSubmitQuestion = () => {
    const text = questionText.trim();

    if (!text || !conversation) {
      showToast({
        type: "danger",
        message: "Please enter a question first.",
        zIndex: 100,
      });
      return;
    }

    postQuestion({
      source: conversation.source,
      target: "",
      text,
      responseIn: conversation.target,
      isQuestion: true,
      conversationId: 0,
    });
  };

  const handleTranslateTo = (language) => {
    if (
      !conversation ||
      !sourceText.trim() ||
      alternateTranslationLoading ||
      chatLoading
    ) {
      return;
    }

    setTranslatingTo(language);
    postAlternateTranslation({
      source: conversation.source,
      target: language,
      text: sourceText,
      responseIn: conversation.target,
      isQuestion: false,
      conversationId: 0,
    });
  };

  return (
    <div className={`translate-page-layout-56yl ${result ? "translate-page-layout-56yl--preview" : ""}`}>
      <div className='translate-page-layout-56yl__container'>
        {result ? (
          <Link className='translate-page-layout-56yl__preview-link' to={`/translation/${conversation.id}`}>
            <span>{sourceFlag} {sourceText}</span>
            <span aria-hidden='true'> → </span>
            <span>{targetFlag} {translatedText}</span>
          </Link>
        ) : <>
        <h1 className='translate-page-layout-56yl__text'>
          {sourceFlag && (
            <span className='translate-page-layout-56yl__flag'>
              {sourceFlag}
            </span>
          )}
          {lastUserMessage ? <GrammarText text={sourceText} parts={grammar?.source} /> : "No text found."}
        </h1>
        <ion-icon
          className='translate-page-layout-56yl__icon'
          name='arrow-forward-outline'
        ></ion-icon>
        <h1 className='translate-page-layout-56yl__text'>
          {targetFlag && (
            <span className='translate-page-layout-56yl__flag'>
              {targetFlag}
            </span>
          )}
          {lastAssistantMessage
            ? <GrammarText text={translatedText} parts={grammar?.target} />
            : "No translation found."}
        </h1>
        </>}

        {hasTranslation && alternateLanguages.length > 0 && (
          <div className='translate-page-layout-56yl__language-selector'>
            <p className='translate-page-layout-56yl__language-label'>
              Translate to
            </p>
            <div className='translate-page-layout-56yl__language-buttons'>
              {alternateLanguages.map((lang) => (
                <Button
                  key={lang.code}
                  type='button'
                  className='translate-page-layout-56yl__language-button'
                  onClick={() => handleTranslateTo(lang.code)}
                  disabled={alternateTranslationLoading || chatLoading}
                  isLoading={
                    alternateTranslationLoading && translatingTo === lang.code
                  }
                  title={`Translate to ${lang.name}`}
                >
                  <span className='translate-page-layout-56yl__language-emoji'>
                    {lang.flag}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {hasTranslation && (
          <Button
            type='button'
            className='translate-page-layout-56yl__chat-button'
            onClick={handleOpenChatModal}
            disabled={alternateTranslationLoading}
            secondary
          >
            <ion-icon name='chatbubble-ellipses-outline'></ion-icon>
            Chat about this
          </Button>
        )}
      </div>

      <Modal
        title='Chat about this translation'
        open={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        closeOnBackdropClick={!chatLoading}
        showWaves={false}
      >
        <p className='translate-page-layout-56yl__chat-description'>
          Ask about <strong>{conversation?.source}</strong> and get a response
          in <strong>{conversation?.target}</strong>.
        </p>
        <TextArea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          onPressEnter={handleSubmitQuestion}
          className='w-100 mb-4'
          minRows={5}
          disabled={chatLoading}
          autoFocus
          onFocus={(e) => {
            const end = e.target.value.length;
            e.target.setSelectionRange(end, end);
          }}
        />
        <Button
          type='button'
          className='translate-page-layout-56yl__chat-submit'
          onClick={handleSubmitQuestion}
          disabled={!questionText.trim() || chatLoading}
          isLoading={chatLoading}
          primary
        >
          Start chat
        </Button>
      </Modal>
      {alternateResult && <Layout key={alternateResult.id} result={alternateResult} />}
    </div>
  );
};

const GrammarText = ({ text, parts }) => {
  if (!Array.isArray(parts) || parts.map((part) => part.text).join("") !== text) return text;
  return parts.map((part, index) => part.tag ? (
    <span className='translate-page-layout-56yl__word' key={index}>
      <span>{part.text}</span>
      <span className='translate-page-layout-56yl__grammar'>{part.tag}</span>
    </span>
  ) : <span key={index}>{part.text}</span>);
};
