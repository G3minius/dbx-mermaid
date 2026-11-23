import { element } from "../lib/dom";
import { getLocale } from "../lib/dbx";
import { getMessages } from "../lib/i18n";
import type { ViewHandle } from "./types";

export function mountFatal(root: HTMLElement, titleText: string, bodyText: string): ViewHandle {
  const section = element("section", "view view--fatal");
  const header = element("header", "view__header");
  const title = element("h1", "view__title", titleText);
  const body = element("p", "view__subtitle", bodyText);
  header.append(title, body);
  section.append(header);
  root.replaceChildren(section);
  return {
    destroy() {
      section.remove();
    }
  };
}

export function mountUnknown(root: HTMLElement, contributionId: string): ViewHandle {
  const messages = getMessages(getLocale());
  const section = element("section", "view view--fatal");
  const header = element("header", "view__header");
  const title = element("h1", "view__title", messages.unknownContributionTitle);
  const body = element("p", "view__subtitle", messages.unknownContributionHint);
  const code = element("code", "view__code", contributionId === "" ? "(empty)" : contributionId);
  header.append(title, body, code);

  const empty = element("div", "empty-state");
  const emptyTitle = element("p", "empty-state__title", messages.fatalTitle);
  const emptyBody = element("p", "empty-state__body", messages.bridgeMissingBody);
  empty.append(emptyTitle, emptyBody);

  section.append(header, empty);
  root.replaceChildren(section);
  return {
    destroy() {
      section.remove();
    }
  };
}
