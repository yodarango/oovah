import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Modal, TextArea } from "@ds";
import { usePost } from "@utils";
import { useAppContext } from "../../context/appContextProvider";
import { API_GET_CONVERSATION, API_POST_TRANSLATE } from "@constants";

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

export const Layout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useAppContext();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [translatingTo, setTranslatingTo] = useState(null);

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
    callback: (data) => {
      setTranslatingTo(null);
      if (!data?.conversationId) return;
      navigate(`/translation/${data.conversationId}`);
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
    if (!id) return;

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
        } else if (result.error) {
          setError(result.error);
        }
      } catch {
        setError("Failed to load translation.");
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [id]);

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

  const sourceText = lastUserMessage?.content || "";
  const translatedText = lastAssistantMessage?.content || "";
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
    <div className='translate-page-layout-56yl'>
      <div className='translate-page-layout-56yl__container'>
        <h1 className='translate-page-layout-56yl__text'>
          {sourceFlag && (
            <span className='translate-page-layout-56yl__flag'>
              {sourceFlag}
            </span>
          )}
          {lastUserMessage ? lastUserMessage.content : "No text found."}
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
            ? lastAssistantMessage.content
            : "No translation found."}
        </h1>

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
    </div>
  );
};
