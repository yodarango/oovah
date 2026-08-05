import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TextArea, Switch, Button, Loading } from "@ds";
import { usePost } from "@utils";
import { useAppContext } from "../../context/appContextProvider";
import {
  API_POST_TRANSLATE,
  API_GET_CONVERSATION,
  API_GET_CONVERSATIONS,
} from "@constants";

// styles
import "./Layout.css";

const LANGUAGES = [
  { code: "English", flag: "🇺🇸", name: "English" },
  { code: "Spanish", flag: "🇲🇽", name: "Spanish" },
  { code: "Italian", flag: "🇮🇹", name: "Italian" },
  { code: "German", flag: "🇩🇪", name: "German" },
  { code: "Greek", flag: "🇬🇷", name: "Greek" },
];

const getFlag = (code) =>
  LANGUAGES.find((lang) => lang.code === code)?.flag || "";

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
  const { showToast } = useAppContext();

  const showErrorToast = (message) => {
    showToast({ type: "danger", message, zIndex: 100 });
  };

  const [source, setSource] = useState(prefs.source || "English");
  const [target, setTarget] = useState(prefs.target || "Spanish");
  const [responseIn, setResponseIn] = useState(prefs.responseIn || "English");
  const [text, setText] = useState("");
  const [isQuestion, setIsQuestion] = useState(prefs.isQuestion || false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

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

  const handleResultClick = (conversation) => {
    const path =
      conversation.type === "question"
        ? `/conversation/${conversation.id}`
        : `/translation/${conversation.id}`;
    navigate(path);
  };

  const handleResponseIn = (v) => {
    setResponseIn(v);
    savePrefs({ responseIn: v });
    if (isQuestion && !text.trim()) {
      showErrorToast("Please enter a question first.");
      return;
    }
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
      showErrorToast(error);
      setMessages((prev) => {
        if (prev.length === 0 || !prev[0].loading) return prev;
        const updated = [...prev];
        updated[0] = { ...updated[0], loading: false };
        return updated;
      });
    }
  }, [error]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(text.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();

    const fetchSearchResults = async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const response = await fetch(
          `${API_GET_CONVERSATIONS}?limit=20&offset=0&search=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + localStorage.getItem("auth"),
            },
            signal: controller.signal,
          },
        );
        const result = await response.json();
        if (result.success && result.data) {
          const all = result.data.conversations || [];
          const expectedType = isQuestion ? "question" : "translation";
          const filtered = all.filter(
            (conversation) => conversation.type === expectedType,
          );
          setSearchResults(filtered);
          setSearchTotal(filtered.length);
        } else if (result.error) {
          setSearchError(result.error);
          setSearchResults([]);
          setSearchTotal(0);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setSearchError("Failed to load history.");
          setSearchResults([]);
          setSearchTotal(0);
        }
      } finally {
        setSearchLoading(false);
      }
    };

    fetchSearchResults();

    return () => controller.abort();
  }, [searchQuery, isQuestion]);

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
        showErrorToast("Failed to load conversation.");
      } finally {
        setConversationLoading(false);
      }
    };

    fetchConversation();
  }, [id]);

  const handleTranslateTo = (lang) => {
    if (!text.trim()) {
      showErrorToast("Please enter some text to translate.");
      return;
    }
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
      {loading && (
        <div className='translate-layout-56yl__loading-overlay'>
          <Loading size={80} color='var(--dr-delta)' />
        </div>
      )}
      <div className='translate-layout-56yl__container'>
        <section className='translate-layout-56yl__body'>
          <div className='translate-layout-56yl__left'>
            {!(loading || conversationLoading) && (
              <div className='translate-language-selector'>
                <p className='translate-language-selector__label'>
                  {isQuestion ? "ASK ABOUT" : "From"}
                  {searchQuery ? ` (${searchTotal})` : ""}
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

          {searchQuery && (
            <div className='translate-layout-56yl__search-results'>
              <p className='translate-layout-56yl__search-results-title'>
                Already in your history
              </p>

              {searchLoading && (
                <p className='translate-layout-56yl__search-empty'>Searching...</p>
              )}

              {searchError && (
                <p className='color-danger translate-layout-56yl__search-empty'>
                  {searchError}
                </p>
              )}

              {!searchLoading && !searchError && searchResults.length === 0 && (
                <p className='translate-layout-56yl__search-empty'>
                  No matches found.
                </p>
              )}

              {searchResults.length > 0 && (
                <ul className='translate-layout-56yl__search-list'>
                  {searchResults.map((conversation) => (
                    <li
                      key={conversation.id}
                      className='translate-layout-56yl__search-item'
                      onClick={() => handleResultClick(conversation)}
                      role='button'
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleResultClick(conversation);
                        }
                      }}
                    >
                      {conversation.type === "question" ? (
                        <p className='translate-layout-56yl__search-preview'>
                          <span className='translate-layout-56yl__search-flag'>
                            {getFlag(conversation.source)}
                          </span>
                          {conversation.first_user_message || "No question"}
                        </p>
                      ) : (
                        <div className='translate-layout-56yl__search-preview'>
                          <p className='translate-layout-56yl__search-preview-row'>
                            <span className='translate-layout-56yl__search-flag'>
                              {getFlag(conversation.source)}
                            </span>
                            {conversation.first_user_message ||
                              "No source text"}
                          </p>
                          <p className='translate-layout-56yl__search-preview-row'>
                            <span className='translate-layout-56yl__search-flag'>
                              {getFlag(conversation.target)}
                            </span>
                            {conversation.first_assistant_message ||
                              "No translation"}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* <div className='translate-layout-56yl__right'>
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
          </div> */}
        </section>
      </div>
    </div>
  );
};
