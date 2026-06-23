import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TextArea, Switch, Button } from "@ds";
import { usePost } from "@utils";
import { API_POST_TRANSLATE, API_GET_CONVERSATION } from "@constants";

// styles
import "./Layout.css";

const LANGUAGES = [
  { code: "English", flag: "🇺🇸", name: "English" },
  { code: "Spanish", flag: "🇲🇽", name: "Spanish" },
  { code: "Italian", flag: "🇮🇹", name: "Italian" },
  { code: "German", flag: "🇩🇪", name: "German" },
  { code: "Greek", flag: "🇬🇷", name: "Greek" },
];

const LS_KEY = "translate_prefs";

const loadPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
};

const savePrefs = (patch) => {
  try {
    const current = JSON.parse(localStorage.getItem(LS_KEY)) || {};
    localStorage.setItem(LS_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
};

const parseQuestionResponse = (raw) => {
  if (!raw) return null;

  // Try standard JSON first
  try {
    return JSON.parse(raw);
  } catch {
    // continue
  }

  // Try unquoted-key object literal: {response: "...", has_corrections: true|false, corrections: "..."}
  const match = raw.match(
    /^\s*\{\s*response\s*:\s*("(?:\\.|[^"\\])*")\s*,\s*has_corrections\s*:\s*(true|false)\s*,\s*corrections\s*:\s*("(?:\\.|[^"\\])*")\s*\}\s*$/,
  );
  if (match) {
    const parseString = (str) => {
      try {
        return JSON.parse(str);
      } catch {
        return str.slice(1, -1).replace(/\\"/g, '"');
      }
    };
    return {
      response: parseString(match[1]),
      has_corrections: match[2] === "true",
      corrections: parseString(match[3]),
    };
  }

  return null;
};

const buildMessagesFromConversation = (conversation) => {
  const pairs = [];
  const msgs = conversation.messages || [];

  for (let i = 0; i < msgs.length; i += 2) {
    const userMsg = msgs[i];
    const assistantMsg = msgs[i + 1];
    if (!userMsg || userMsg.role !== "user") continue;

    let questionData = null;
    let translation = assistantMsg ? assistantMsg.content : "";

    if (conversation.type === "question" && assistantMsg) {
      const parsed = parseQuestionResponse(assistantMsg.content);
      if (parsed) {
        questionData = {
          response: parsed.response || "",
          hasCorrections: !!parsed.has_corrections,
          corrections: parsed.corrections || "",
        };
        translation = parsed.response || "";
      }
    }

    pairs.push({
      userText: userMsg.content,
      translation,
      isQuestion: conversation.type === "question",
      questionData,
      loading: false,
    });
  }

  return pairs.reverse();
};

export const Layout = () => {
  const prefs = loadPrefs();
  const { id } = useParams();
  const navigate = useNavigate();

  const [source, setSource] = useState(prefs.source || "English");
  const [target, setTarget] = useState(prefs.target || "Spanish");
  const [responseIn, setResponseIn] = useState(prefs.responseIn || "English");
  const [text, setText] = useState("");
  const [isQuestion, setIsQuestion] = useState(prefs.isQuestion || false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const updateLatestMessage = (updates) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[0] = { ...updated[0], ...updates, loading: false };
      return updated;
    });
  };

  const handleSource = (v) => {
    setSource(v);
    savePrefs({ source: v });
  };
  const handleTarget = (v) => {
    setTarget(v);
    savePrefs({ target: v });
  };
  const handleResponseIn = (v) => {
    setResponseIn(v);
    savePrefs({ responseIn: v });
    if (isQuestion && text.trim()) {
      setMessages((prev) => [
        {
          userText: text,
          translation: "",
          isQuestion: true,
          questionData: null,
          loading: true,
        },
        ...prev,
      ]);
      setText("");
      post({
        source,
        target: "",
        text,
        responseIn: v,
        isQuestion: true,
        conversationId: id ? parseInt(id, 10) : 0,
      });
    }
  };
  const handleIsQuestion = (v) => {
    setIsQuestion(v);
    savePrefs({ isQuestion: v });
  };

  const { post, loading, error } = usePost({
    url: API_POST_TRANSLATE,
    callback: (data) => {
      if (!data || !data.translation) return;
      if (isQuestion) {
        const parsed = parseQuestionResponse(data.translation);
        if (parsed) {
          updateLatestMessage({
            translation: parsed.response || "",
            questionData: {
              response: parsed.response || "",
              hasCorrections: !!parsed.has_corrections,
              corrections: parsed.corrections || "",
            },
          });
        } else {
          updateLatestMessage({ translation: data.translation });
        }
      } else {
        updateLatestMessage({ translation: data.translation });
      }

      if (data.conversationId && String(data.conversationId) !== id) {
        navigate(
          isQuestion
            ? `/conversation/${data.conversationId}`
            : `/translation/${data.conversationId}`,
        );
      }
    },
  });

  useEffect(() => {
    if (error) {
      setMessages((prev) => {
        if (prev.length === 0 || !prev[0].loading) return prev;
        const updated = [...prev];
        updated[0] = { ...updated[0], loading: false };
        return updated;
      });
    }
  }, [error]);

  useEffect(() => {
    if (!id) {
      setConversationLoading(false);
      return;
    }

    const fetchConversation = async () => {
      setConversationLoading(true);
      try {
        const response = await fetch(`${API_GET_CONVERSATION}${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("auth"),
          },
        });
        const result = await response.json();
        if (result.success && result.data) {
          const conversation = result.data;
          const fallbackPrefs = loadPrefs();
          setSource(conversation.source || fallbackPrefs.source || "English");
          setTarget(conversation.target || fallbackPrefs.target || "Spanish");
          setResponseIn(
            conversation.response_in || fallbackPrefs.responseIn || "English",
          );
          setIsQuestion(conversation.type === "question");
          setMessages(buildMessagesFromConversation(conversation));
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
      } finally {
        setConversationLoading(false);
      }
    };

    fetchConversation();
  }, [id]);

  const handleTranslateTo = (lang) => {
    if (!text.trim()) return;
    handleTarget(lang);
    if (source === lang) {
      setMessages((prev) => [
        {
          userText: text,
          translation: text,
          isQuestion: false,
          questionData: null,
          loading: false,
        },
        ...prev,
      ]);
      setText("");
      return;
    }
    setMessages((prev) => [
      {
        userText: text,
        translation: "",
        isQuestion,
        questionData: null,
        loading: true,
      },
      ...prev,
    ]);
    setText("");
    post({
      source,
      target: lang,
      text,
      responseIn,
      isQuestion,
      conversationId: id ? parseInt(id, 10) : 0,
    });
  };

  return (
    <div className='translate-layout-56yl'>
      <div className='translate-layout-56yl__container'>
        <h2 className='text-center mb-4'>OOVAH</h2>

        <section className='translate-layout-56yl__body'>
          <div className='translate-layout-56yl__left'>
            {!(loading || conversationLoading) && (
              <div className='translate-language-selector'>
                <p className='translate-language-selector__label'>
                  {isQuestion ? "ASK ABOUT" : "From"}
                </p>
                <div className='translate-language-selector__flags translate-language-selector__flags--translate'>
                  {LANGUAGES.map((lang) => (
                    <Button
                      key={lang.code}
                      type='button'
                      className={`translate-language-selector__flag ${
                        source === lang.code
                          ? "translate-language-selector__flag--active"
                          : ""
                      }`}
                      onClick={() => handleSource(lang.code)}
                      title={lang.name}
                    >
                      <span className='translate-language-selector__flag-emoji'>
                        {lang.flag}
                      </span>
                      <span className='translate-language-selector__flag-name'>
                        {lang.name}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className='translate-layout-56yl__section mb-4'>
              <TextArea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='Type or paste text to translate...'
                className='w-100'
                rows={6}
                disabled={loading || conversationLoading}
              />
            </div>

            <div className='translate-layout-56yl__switch mb-4'>
              <Switch
                checked={isQuestion}
                onChange={() => handleIsQuestion(!isQuestion)}
                label='This is a question'
                disabled={loading || conversationLoading}
              />
            </div>

            {!isQuestion && !(loading || conversationLoading) && (
              <div className='translate-language-selector mb-4'>
                <p className='translate-language-selector__label'>
                  Translate to
                </p>
                <div className='translate-language-selector__flags translate-language-selector__flags--translate'>
                  {LANGUAGES.map((lang) => (
                    <Button
                      key={lang.code}
                      type='button'
                      className={`translate-language-selector__flag flag-primary ${
                        target === lang.code
                          ? "translate-language-selector__flag--active"
                          : ""
                      }`}
                      onClick={() => handleTranslateTo(lang.code)}
                      title={lang.name}
                    >
                      <span className='translate-language-selector__flag-emoji'>
                        {lang.flag}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {isQuestion && !(loading || conversationLoading) && (
              <div className='translate-language-selector'>
                <p className='translate-language-selector__label'>In</p>
                <div className='translate-language-selector__flags translate-language-selector__flags--translate'>
                  {LANGUAGES.map((lang) => (
                    <Button
                      key={lang.code}
                      type='button'
                      className={`translate-language-selector__flag flag-primary ${
                        responseIn === lang.code
                          ? "translate-language-selector__flag--active"
                          : ""
                      }`}
                      onClick={() => handleResponseIn(lang.code)}
                      title={lang.name}
                    >
                      <span className='translate-language-selector__flag-emoji'>
                        {lang.flag}
                      </span>
                      <span className='translate-language-selector__flag-name'>
                        {lang.name}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className='translate-layout-56yl__right'>
            <div className='translate-layout-56yl__messages'>
              {error ? (
                <p className='color-danger'>{error}</p>
              ) : messages.length > 0 ? (
                messages.map((message, index) => (
                  <div className='translate-layout-56yl__message' key={index}>
                    <div className='translate-layout-56yl__message-user'>
                      <p>{message.userText}</p>
                    </div>
                    <div className='translate-layout-56yl__message-assistant'>
                      {message.loading ? (
                        <p className='opacity-50'>Thinking...</p>
                      ) : (
                        <p>{message.translation}</p>
                      )}
                    </div>
                    {message.isQuestion && message.questionData && (
                      <div className='translate-layout-56yl__corrections'>
                        <div className='translate-layout-56yl__corrections-header'>
                          <ion-icon
                            name={
                              message.questionData.hasCorrections
                                ? "close-circle"
                                : "checkmark-circle"
                            }
                            class={`translate-layout-56yl__corrections-icon ${
                              message.questionData.hasCorrections
                                ? "translate-layout-56yl__corrections-icon--error"
                                : "translate-layout-56yl__corrections-icon--success"
                            }`}
                          ></ion-icon>
                          <span>
                            {message.questionData.hasCorrections
                              ? "Corrections needed"
                              : "No corrections needed"}
                          </span>
                        </div>
                        {message.questionData.hasCorrections && (
                          <p className='translate-layout-56yl__corrections-text'>
                            {message.questionData.corrections}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
