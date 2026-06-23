import { useState } from "react";
import { TextArea, Switch, Button } from "@ds";
import { usePost } from "@utils";
import { API_POST_TRANSLATE } from "@constants";

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

export const Layout = () => {
  const prefs = loadPrefs();

  const [source, setSource] = useState(prefs.source || "English");
  const [target, setTarget] = useState(prefs.target || "Spanish");
  const [responseIn, setResponseIn] = useState(prefs.responseIn || "English");
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [isQuestion, setIsQuestion] = useState(prefs.isQuestion || false);
  const [questionData, setQuestionData] = useState(null);

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
      post({
        source,
        target: "",
        text,
        responseIn: v,
        isQuestion: true,
      });
    }
  };
  const handleIsQuestion = (v) => {
    setIsQuestion(v);
    savePrefs({ isQuestion: v });
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

  const { post, loading, error } = usePost({
    url: API_POST_TRANSLATE,
    callback: (data) => {
      if (!data || !data.translation) return;
      if (isQuestion) {
        const parsed = parseQuestionResponse(data.translation);
        if (parsed) {
          setQuestionData({
            response: parsed.response || "",
            hasCorrections: !!parsed.has_corrections,
            corrections: parsed.corrections || "",
          });
          setTranslation(parsed.response || "");
        } else {
          setQuestionData(null);
          setTranslation(data.translation);
        }
      } else {
        setQuestionData(null);
        setTranslation(data.translation);
      }
    },
  });

  const handleTranslateTo = (lang) => {
    if (!text.trim()) return;
    handleTarget(lang);
    if (source === lang) {
      setTranslation(text);
      return;
    }
    post({
      source,
      target: lang,
      text,
      responseIn,
      isQuestion,
    });
  };

  return (
    <div className='translate-layout-56yl'>
      <div className='translate-layout-56yl__container'>
        <h2 className='text-center mb-4'>OOVAH</h2>

        <section className='translate-layout-56yl__body'>
          <div className='translate-layout-56yl__left'>
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

            <div className='translate-layout-56yl__section mb-4'>
              <TextArea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='Type or paste text to translate...'
                className='w-100'
                rows={6}
              />
            </div>

            <div className='translate-layout-56yl__switch mb-4'>
              <Switch
                checked={isQuestion}
                onChange={() => handleIsQuestion(!isQuestion)}
                label='This is a question'
              />
            </div>

            {!isQuestion && (
              <div className='translate-language-selector mb-4'>
                <p className='translate-language-selector__label'>
                  Translate to
                </p>
                <div className='translate-language-selector__flags translate-language-selector__flags--translate'>
                  {LANGUAGES.map((lang) => (
                    <Button
                      key={lang.code}
                      type='button'
                      className={`translate-language-selector__flag translate-language-selector__flag--action ${
                        target === lang.code && loading
                          ? "translate-language-selector__flag--loading"
                          : ""
                      } ${target === lang.code && !loading ? "translate-language-selector__flag--active" : ""}`}
                      onClick={() => handleTranslateTo(lang.code)}
                      title={lang.name}
                      disabled={loading}
                    >
                      <span className='translate-language-selector__flag-emoji'>
                        {lang.flag}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className='translate-language-selector'>
              <p className='translate-language-selector__label'>In</p>
              <div className='translate-language-selector__flags translate-language-selector__flags--translate'>
                {LANGUAGES.map((lang) => (
                  <Button
                    key={lang.code}
                    type='button'
                    className={`translate-language-selector__flag flag-primary ${
                      isQuestion && responseIn === lang.code && loading
                        ? "translate-language-selector__flag--loading"
                        : ""
                    } ${
                      responseIn === lang.code
                        ? "translate-language-selector__flag--active"
                        : ""
                    }`}
                    onClick={() => handleResponseIn(lang.code)}
                    title={lang.name}
                    disabled={loading}
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
          </div>

          <div className='translate-layout-56yl__right'>
            <div className='translate-layout-56yl__output'>
              {error ? (
                <p className='color-danger'>{error}</p>
              ) : translation ? (
                <p>{translation}</p>
              ) : (
                <p className='opacity-50'>Translation will appear here...</p>
              )}
            </div>

            {isQuestion && questionData && (
              <div className='translate-layout-56yl__corrections'>
                <div className='translate-layout-56yl__corrections-header'>
                  <ion-icon
                    name={
                      questionData.hasCorrections
                        ? "close-circle"
                        : "checkmark-circle"
                    }
                    class={`translate-layout-56yl__corrections-icon ${
                      questionData.hasCorrections
                        ? "translate-layout-56yl__corrections-icon--error"
                        : "translate-layout-56yl__corrections-icon--success"
                    }`}
                  ></ion-icon>
                  <span>
                    {questionData.hasCorrections
                      ? "Corrections needed"
                      : "No corrections needed"}
                  </span>
                </div>
                {questionData.hasCorrections && (
                  <p className='translate-layout-56yl__corrections-text'>
                    {questionData.corrections}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
