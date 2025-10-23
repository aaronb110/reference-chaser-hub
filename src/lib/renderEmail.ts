"use server";

import { renderToStaticMarkup } from "react-dom/server";

export function renderEmail(component: React.ReactElement) {
  return "<!DOCTYPE html>" + renderToStaticMarkup(component);
}
