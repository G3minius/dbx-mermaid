import "./styles.css";
import { applyEnvironment, getContributionId, getLocale, hasBridge, waitForReady } from "./lib/dbx";
import { WORKBENCH_ID } from "./lib/constants";
import { getMessages } from "./lib/i18n";
import { mountFatal, mountUnknown } from "./views/Fallback";
import { mountWorkbench } from "./views/Workbench";
import type { ViewHandle } from "./views/types";

const root = document.querySelector<HTMLElement>("#app");
const bootMessage = document.querySelector<HTMLElement>("#boot-message");
const initialMessages = getMessages(getLocale());

if (bootMessage !== null) {
  bootMessage.textContent = initialMessages.bootLoading;
}

async function boot(): Promise<void> {
  if (root === null) {
    return;
  }

  if (!hasBridge()) {
    mountFatal(root, initialMessages.fatalTitle, initialMessages.bridgeMissingBody);
    return;
  }

  try {
    await waitForReady();
  } catch {
    mountFatal(root, initialMessages.fatalTitle, initialMessages.bootFailedBody);
    return;
  }

  applyEnvironment();

  const contributionId = getContributionId();
  root.replaceChildren();

  let handle: ViewHandle;
  if (contributionId === WORKBENCH_ID || contributionId === "") {
    // Older hosts may not expose the contribution id. The plugin now has a
    // single workbench, so an empty id should still open the editor.
    handle = mountWorkbench(root);
  } else {
    handle = mountUnknown(root, contributionId);
  }

  window.addEventListener(
    "pagehide",
    () => {
      handle.destroy();
    },
    { once: true }
  );
}

void boot();
