const paths = {
  settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'm9 3-1 3-3 1-2 3 2 2-1 3 3 2 2-1 3 1 2-2 3-1v-3l2-2-2-3-3-1-1-3Z'],
  text: ['M4 5h16M12 5v15M8 20h8'],
  effects: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z', 'M20 2v4M18 4h4'],
  layout: ['M3 3h18v18H3zM3 9h18M9 9v12'],
  tools: ['m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16'],
  arrow: ['m14 5-7 7 7 7'],
  link: ['m10 13 4-4', 'M8 16H7a4 4 0 0 1-3-7l4-4a4 4 0 0 1 6 0', 'M16 8h1a4 4 0 0 1 3 7l-4 4a4 4 0 0 1-6 0'],
  check: ['m5 12 4 4L19 6'],
  alert: ['M12 8v5M12 17h.01', 'M10.3 3.8 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z'],
  screen: ['M3 4h18v13H3zM12 17v4M8 21h8'],
  chevron: ['m6 9 6 6 6-6'],
  play: ['m9 5 11 7-11 7Z'],
  reset: ['M3 10a9 9 0 1 1 2 8M3 4v6h6'],
};

export default function ObsIcon({ name, size = 18, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {(paths[name] || paths.settings).map((path, index) => <path key={index} d={path} />)}
  </svg>;
}
