import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { TextArea, Button } from "@ds";
import { usePost } from "@utils";
import { API_POST_TRANSLATE, API_GET_CONVERSATION } from "@constants";

// styles
import "./Layout.css";

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

  return pairs;
};

export const Layout = () => {
  const { id } = useParams();
  const messagesEndRef = useRef(null);

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { post } = usePost({
    url: API_POST_TRANSLATE,
    callback: (data) => {
      if (!data || !data.translation) return;

      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex < 0) return prev;

        if (updated[lastIndex].isQuestion) {
          const parsed = parseQuestionResponse(data.translation);
          if (parsed) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              translation: parsed.response || "",
              questionData: {
                response: parsed.response || "",
                hasCorrections: !!parsed.has_corrections,
                corrections: parsed.corrections || "",
              },
              loading: false,
            };
          } else {
            updated[lastIndex] = {
              ...updated[lastIndex],
              translation: data.translation,
              loading: false,
            };
          }
        } else {
          updated[lastIndex] = {
            ...updated[lastIndex],
            translation: data.translation,
            loading: false,
          };
        }
        return updated;
      });
    },
  });

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
          setMessages(buildMessagesFromConversation(conversationData));
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError("Failed to load conversation.");
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    if (!text.trim() || !conversation) return;

    const isQuestion = conversation.type === "question";

    setMessages((prev) => [
      ...prev,
      {
        userText: text,
        translation: "",
        isQuestion,
        questionData: null,
        loading: true,
      },
    ]);

    const currentText = text;
    setText("");

    post({
      source: conversation.source,
      target: conversation.target,
      text: currentText,
      responseIn: conversation.response_in,
      isQuestion,
      conversationId: parseInt(id, 10),
    });
  };

  const buttonLabel =
    conversation && conversation.type === "question" ? "Ask" : "Translate";

  return (
    <div className='conversation-layout-56yl'>
      <div className='conversation-layout-56yl__messages'>
        {loading && messages.length === 0 ? (
          <p className='conversation-layout-56yl__empty'>Loading...</p>
        ) : error ? (
          <p className='color-danger conversation-layout-56yl__empty'>
            {error}
          </p>
        ) : messages.length === 0 ? (
          <p className='conversation-layout-56yl__empty'>
            No messages yet.
          </p>
        ) : (
          messages.map((message, index) => (
            <div className='conversation-layout-56yl__message' key={index}>
              <div className='conversation-layout-56yl__message-user'>
                <p>{message.userText}</p>
              </div>
              <div className='conversation-layout-56yl__message-assistant'>
                {message.loading ? (
                  <p className='opacity-50'>Thinking...</p>
                ) : (
                  <p>{message.translation}</p>
                )}
              </div>
              {message.isQuestion && message.questionData && (
                <div className='conversation-layout-56yl__corrections'>
                  <div className='conversation-layout-56yl__corrections-header'>
                    <ion-icon
                      name={
                        message.questionData.hasCorrections
                          ? "close-circle"
                          : "checkmark-circle"
                      }
                      class={`conversation-layout-56yl__corrections-icon ${
                        message.questionData.hasCorrections
                          ? "conversation-layout-56yl__corrections-icon--error"
                          : "conversation-layout-56yl__corrections-icon--success"
                      }`}
                    ></ion-icon>
                    <span>
                      {message.questionData.hasCorrections
                        ? "Corrections needed"
                        : "No corrections needed"}
                    </span>
                  </div>
                  {message.questionData.hasCorrections && (
                    <p className='conversation-layout-56yl__corrections-text'>
                      {message.questionData.corrections}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className='conversation-layout-56yl__input'>
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Type your message...'
          className='conversation-layout-56yl__textarea'
          rows={2}
          disabled={!conversation}
        />
        <Button
          type='button'
          className='conversation-layout-56yl__button'
          onClick={handleSubmit}
          disabled={!text.trim() || !conversation}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
};
