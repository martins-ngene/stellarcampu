import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import PortalLayout from "../app/portal/layout";

test("portal layout renders its page segment without depending on auth state", () => {
  const html = renderToString(
    PortalLayout({
      children: createElement(
        "main",
        { "data-page-segment": "profile" },
        "Profile route segment",
      ),
    }),
  );
  assert.match(html, /Profile route segment/);
});
