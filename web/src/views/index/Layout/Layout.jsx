import { useState } from "react";
import { TextArea, Button, Switch } from "@ds";
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

const LanguageSelector = ({ selected, onSelect, label }) => {
  return (
    <div className="translate-language-selector">
      {label && <p className="translate-language-selector__label">{label}</p>}
      <div className="translate-language-selector__flags">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            className={`translate-language-selector__flag ${
              selected === lang.code ? "translate-language-selector__flag--active" : ""
            }`}
            onClick={() => onSelect(lang.code)}
            title={lang.name}
          >
            <span className="translate-language-selector__flag-emoji">{lang.flag}</span>
            <span className="translate-language-selector__flag-name">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const Layout = () => {
  const prefs = loadPrefs();

  const [source, setSource] = useState(prefs.source || "English");
  const [target, setTarget] = useState(prefs.target || "Spanish");
  const [responseIn, setResponseIn] = useState(prefs.responseIn || "English");
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [showInstructions, setShowInstructions] = useState(prefs.showInstructions || false);
  const [instructions, setInstructions] = useState(prefs.instructions || "");

  const handleSource = (v) => { setSource(v); savePrefs({ source: v }); };
  const handleTarget = (v) => { setTarget(v); savePrefs({ target: v }); };
  const handleResponseIn = (v) => { setResponseIn(v); savePrefs({ responseIn: v }); };
  const handleShowInstructions = (v) => { setShowInstructions(v); savePrefs({ showInstructions: v }); };
  const handleInstructions = (v) => { setInstructions(v); savePrefs({ instructions: v }); };

  const { post, loading, error } = usePost({
    url: API_POST_TRANSLATE,
    callback: (data) => {
      if (data && data.translation) {
        setTranslation(data.translation);
      }
    },
  });

  const handleTranslate = () => {
    if (!text.trim()) return;
    if (source === target) {
      setTranslation(text);
      return;
    }
    post({
      source,
      target,
      text,
      responseIn,
      instructions: showInstructions ? instructions : "",
    });
  };

  return (
    <div className="translate-layout-56yl">
      <div className="translate-layout-56yl__container">
        <h2 className="text-center mb-4">Translate</h2>

        <section className="translate-layout-56yl__body">
          <div className="translate-layout-56yl__left">
            <LanguageSelector
              label="From"
              selected={source}
              onSelect={handleSource}
            />

            <div className="translate-layout-56yl__section mb-4">
              <TextArea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste text to translate..."
                className="w-100"
                rows={6}
              />
            </div>

            <div className="translate-layout-56yl__switch mb-4">
              <Switch
                checked={showInstructions}
                onChange={() => handleShowInstructions(!showInstructions)}
                label="Add specific instructions for the translation"
              />
            </div>

            {showInstructions && (
              <div className="translate-layout-56yl__section mb-4">
                <TextArea
                  value={instructions}
                  onChange={(e) => handleInstructions(e.target.value)}
                  placeholder="E.g., Use formal tone, translate for business context, preserve technical terms..."
                  className="w-100"
                  rows={3}
                />
              </div>
            )}

            <LanguageSelector
              label="To"
              selected={target}
              onSelect={handleTarget}
            />

            <LanguageSelector
              label="In"
              selected={responseIn}
              onSelect={handleResponseIn}
            />

            <div className="translate-layout-56yl__actions mb-4">
              <Button
                primary
                isLoading={loading}
                onClick={handleTranslate}
                className="w-100"
              >
                Translate
              </Button>
            </div>
          </div>

          <div className="translate-layout-56yl__right">
            <div className="translate-layout-56yl__output">
              {error ? (
                <p className="color-danger">{error}</p>
              ) : translation ? (
                <p>{translation}</p>
              ) : (
                <p className="opacity-50">Translation will appear here...</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
