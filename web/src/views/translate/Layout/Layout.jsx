import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_GET_CONVERSATION } from "@constants";

// styles
import "./Layout.css";

const LANGUAGES = [
  { code: "English", flag: "🇺🇸" },
  { code: "Spanish", flag: "🇲🇽" },
  { code: "Italian", flag: "🇮🇹" },
  { code: "German", flag: "🇩🇪" },
  { code: "Greek", flag: "🇬🇷" },
];

export const Layout = () => {
  const { id } = useParams();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      } catch (err) {
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
          {lastAssistantMessage
            ? lastAssistantMessage.content
            : "No translation found."}
        </h1>
      </div>
    </div>
  );
};
