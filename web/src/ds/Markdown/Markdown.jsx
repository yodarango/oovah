import { useMemo } from "react";
import { marked } from "marked";

// styles
import "./Markdown.css";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export const Markdown = (props) => {
  const { children = "", className = "", ...rest } = props;

  const html = useMemo(() => {
    const source = typeof children === "string" ? children : "";
    return marked.parse(source);
  }, [children]);

  const finalClassName = `markdown-2h4k ${className}`.trim();

  return (
    <div
      className={finalClassName}
      dangerouslySetInnerHTML={{ __html: html }}
      {...rest}
    />
  );
};

export default Markdown;
