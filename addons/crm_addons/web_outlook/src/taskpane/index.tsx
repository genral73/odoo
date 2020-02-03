import "office-ui-fabric-react/dist/css/fabric.min.css";
import App from "./components/App";
import { AppContainer } from "react-hot-loader";
import { initializeIcons } from "office-ui-fabric-react/lib/Icons";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { Authenticator} from '@microsoft/office-js-helpers';
//import {HttpVerb, sendHttpRequest, ContentType} from "../utils/httpRequest";
/* global AppCpntainer, Component, document, Office, module, require */
//let baseurl = "https://ca7d8e56.ngrok.io";

initializeIcons();

let isOfficeInitialized = false;

const title = "Odoo CRM";

const render = Component => {
  ReactDOM.render(
    <AppContainer>
      <Component title={title} isOfficeInitialized={isOfficeInitialized} />
    </AppContainer>,
    document.getElementById("container")
  );
};

/* Render application after Office initializes */
Office.initialize = () => {
  if (Authenticator.isAuthDialog()) return;
  isOfficeInitialized = true;
  render(App);
};

/* Initial render showing a progress bar */
render(App);

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    render(NextApp);
  });
}
