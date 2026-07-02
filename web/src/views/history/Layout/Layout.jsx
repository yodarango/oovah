import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/appContextProvider";
import { API_GET_CONVERSATIONS, API_DELETE_CONVERSATION } from "@constants";

// styles
import "./Layout.css";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const LANGUAGES = [
  { code: "English", flag: "🇺🇸" },
  { code: "Spanish", flag: "🇲🇽" },
  { code: "Italian", flag: "🇮🇹" },
  { code: "German", flag: "🇩🇪" },
  { code: "Greek", flag: "🇬🇷" },
];

const getFlag = (code) =>
  LANGUAGES.find((lang) => lang.code === code)?.flag || "";

export const Layout = () => {
  const navigate = useNavigate();
  const { showToast } = useAppContext();

  const showErrorToast = (message) => {
    showToast({ type: "danger", message, zIndex: 100 });
  };

  const [conversations, setConversations] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const observerTarget = useRef(null);
  const loadingRef = useRef(false);

  const fetchConversations = useCallback(
    async (currentOffset) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const searchParam = search
          ? `&search=${encodeURIComponent(search)}`
          : "";
        const response = await fetch(
          `${API_GET_CONVERSATIONS}?limit=20&offset=${currentOffset}${searchParam}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + localStorage.getItem("auth"),
            },
          },
        );
        const result = await response.json();
        if (result.success && result.data) {
          const newConversations = result.data.conversations || [];
          const fetchedTotal = result.data.total || 0;
          setTotal(fetchedTotal);
          setConversations((prev) =>
            currentOffset === 0
              ? newConversations
              : [...prev, ...newConversations],
          );
          const nextOffset = currentOffset + newConversations.length;
          setOffset(nextOffset);
          setHasMore(nextOffset < fetchedTotal);
        } else if (result.error) {
          setError(result.error);
          showErrorToast(result.error);
          setHasMore(false);
        }
      } catch (err) {
        setError("Failed to load history.");
        showErrorToast("Failed to load history.");
        setHasMore(false);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [search],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setConversations([]);
    setOffset(0);
    setHasMore(true);
    setError(null);
    fetchConversations(0);
  }, [fetchConversations]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && !error) {
          fetchConversations(offset);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [observerTarget, hasMore, offset, fetchConversations, error]);

  const handleCardClick = (conversation) => {
    const path =
      conversation.type === "question"
        ? `/conversation/${conversation.id}`
        : `/translation/${conversation.id}`;
    navigate(path);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      const response = await fetch(`${API_DELETE_CONVERSATION}${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("auth"),
        },
      });
      const result = await response.json();
      if (result.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
      } else if (result.error) {
        setError(result.error);
        showErrorToast(result.error);
      }
    } catch (err) {
      setError("Failed to delete conversation.");
      showErrorToast("Failed to delete conversation.");
    }
  };

  return (
    <div className='history-layout-56yl'>
      <div className='history-layout-56yl__container'>
        <h2 className='history-layout-56yl__title'>History ({total})</h2>

        <div className='history-layout-56yl__search'>
          <input
            type='text'
            className='history-layout-56yl__search-input'
            placeholder='Search translations and conversations...'
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label='Search history'
          />
          {searchInput && (
            <button
              className='history-layout-56yl__search-clear'
              onClick={() => setSearchInput("")}
              aria-label='Clear search'
              type='button'
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <p className='color-danger history-layout-56yl__empty'>{error}</p>
        )}

        {conversations.length === 0 && !loading && !error && (
          <p className='history-layout-56yl__empty'>
            {search ? "No matches found." : "No conversations yet."}
          </p>
        )}

        <div className='history-layout-56yl__grid'>
          {conversations.map((conversation) => (
            <div
              className='history-layout-56yl__card'
              key={conversation.id}
              onClick={() => handleCardClick(conversation)}
              role='button'
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleCardClick(conversation);
                }
              }}
            >
              <div className='history-layout-56yl__card-content'>
                <p className='history-layout-56yl__date'>
                  {formatDate(conversation.created_at)}
                </p>
                {conversation.type === "question" ? (
                  <p className='history-layout-56yl__preview'>
                    <span className='history-layout-56yl__flag'>
                      {getFlag(conversation.source)}
                    </span>
                    {conversation.first_user_message || "No message"}
                  </p>
                ) : (
                  <div className='history-layout-56yl__preview'>
                    <p className='history-layout-56yl__preview-row'>
                      <span className='history-layout-56yl__flag'>
                        {getFlag(conversation.source)}
                      </span>
                      {conversation.first_user_message || "No source text"}
                    </p>
                    <p className='history-layout-56yl__preview-row'>
                      <span className='history-layout-56yl__flag'>
                        {getFlag(conversation.target)}
                      </span>
                      {conversation.first_assistant_message || "No translation"}
                    </p>
                  </div>
                )}
                <p className='history-layout-56yl__count'>
                  {conversation.message_count || 0} messages
                </p>
              </div>
              <div className='history-layout-56yl__card-actions'>
                <ion-icon
                  className='history-layout-56yl__delete'
                  name='trash-outline'
                  onClick={(e) => handleDelete(e, conversation.id)}
                  title='Delete'
                ></ion-icon>
              </div>
            </div>
          ))}
        </div>

        <div ref={observerTarget} className='history-layout-56yl__observer'>
          {loading && (
            <p className='history-layout-56yl__loading'>Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
};
