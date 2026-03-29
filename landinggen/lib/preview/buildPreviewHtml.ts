export function buildPreviewHtml(tsxSource: string) {
  const escaped = tsxSource
    .replaceAll("</script>", "<\\/script>")
    .replaceAll("<!--", "<\\!--");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      html, body { height: 100%; }
      body { margin: 0; background: #000; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/framer-motion@12.35.2/dist/framer-motion.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script type="text/babel" data-presets="react">
      // PREVIEW_TSX helpers:
      // - window.Motion is the UMD namespace
      // - Motion (below) is the motion proxy so <Motion.div /> works
      // - motion is also available for <motion.div /> if you prefer
      const motion = window.Motion && (window.Motion.motion || (window.Motion.default && window.Motion.default.motion));
      const Motion = motion;
${escaped}

      // Optional: allow PREVIEW_TSX to use Framer Motion without imports:
      //   const { motion, AnimatePresence } = Motion
      // (UMD build attaches global "Motion" and expects "React" global.)
      const Root = typeof Landing === "function" ? Landing : (() => React.createElement("div", null, "No Landing() component found."));
      const root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(React.createElement(Root));
    </script>
  </body>
</html>`;
}

