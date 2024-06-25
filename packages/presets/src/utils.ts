export function replaceHtmlPaths(html: string) {
  // TODO prefix root-level assets - this only removes the leading /
  return html.replace(/(href|src)="\/((?:[\w\s-]+\/)*[^/]+\.(?:js|css|svg))/g, '$1="$2');
}
