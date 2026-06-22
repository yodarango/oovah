import { useState } from "react";
import { TextArea, Button } from "@ds";
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

const LanguageSelector = ({ selected, onSelect, label }) => {
  return (
    <div className='translate-language-selector'>
      {label && <p className='translate-language-selector__label'>{label}</p>}
      <div className='translate-language-selector__flags'>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type='button'
            className={`translate-language-selector__flag ${
              selected === lang.code ? "translate-language-selector__flag--active" : ""
            }`}
            onClick={() => onSelect(lang.code)}
            title={lang.name}
          >
            <span className='translate-language-selector__flag-emoji'>{lang.flag}</span>
            <span className='translate-language-selector__flag-name'>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const Layout = () => {
  const [source, setSource] = useState("English");
  const [target, setTarget] = useState("Spanish");
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");

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
    post({ source, target, text });
  };

  return (
    <div className='translate-layout-56yl'>
      <div className='translate-layout-56yl__container bg-gamma rounded-3 p-4'>
        <h2 className='text-center mb-4'>Translate</h2>

        <LanguageSelector
          label='From'
          selected={source}
          onSelect={setSource}
        />

        <div className='translate-layout-56yl__section mb-4'>
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Type or paste text to translate...'
            className='w-100'
            rows={6}
          />
        </div>

        <LanguageSelector
          label='To'
          selected={target}
          onSelect={setTarget}
        />

        <div className='translate-layout-56yl__actions mb-4'>
          <Button
            primary
            isLoading={loading}
            onClick={handleTranslate}
            className='w-100'
          >
            Translate
          </Button>
        </div>

        <div className='translate-layout-56yl__section'>
          <div className='translate-layout-56yl__output'>
            {error ? (
              <p className='color-danger'>{error}</p>
            ) : translation ? (
              <p>{translation}</p>
            ) : (
              <p className='opacity-50'>Translation will appear here...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
