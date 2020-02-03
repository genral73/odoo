import * as React from "react";
import { TextField } from "office-ui-fabric-react/lib/TextField";
import { PrimaryButton } from "office-ui-fabric-react";
import {HttpVerb, sendHttpRequest} from "../../../utils/httpRequest";
import Header from "../Header";
import api from "../../api";

type LoginProps = { 
  goToMain: Function,
  //errorMessage: string
};
type LoginState = { 
  isLoading: boolean;
  baseURL: string;
};
class Login extends React.Component<LoginProps, LoginState> {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      baseURL: localStorage.getItem("baseURL")
    };
  }

  private onServerChange = (_, newValue?: string): void => {
    this.setState({
      baseURL: newValue
    });
  }

  login = () => {
    api.baseURL = this.state.baseURL;
    localStorage.setItem('baseURL', this.state.baseURL)
    const self = this;
    const options = {
      height: 65,
      width: 30,
      promptBeforeOpen: true,
    };
    Office.context.ui.displayDialogAsync(api.baseURL + api.login + '/?redirect=' + api.redirect, options , function (asyncResult){
      console.log(asyncResult);
      let dialog = asyncResult.value;
      dialog.addEventHandler(Office.EventType.DialogMessageReceived, function(_arg) {
        dialog.close();
        let code = new URL(JSON.parse(_arg.message).value).searchParams.get("code");
        console.log(code);
        let formData = new FormData();
        formData.append("code", code);

        sendHttpRequest(HttpVerb.POST, api.baseURL + api.token, null, null, formData)
        .then(function (response){
          console.log("GOT THE TOKEN");
          console.log(response);
          localStorage.setItem('token', JSON.parse(response).access_token);
          self.props.goToMain();
        });
        /*axios.get(baseurl + "/token_add_ons", {params: {code: code}})
        .then(function (response){
          localStorage.setItem('token', response.data.access_token);
          mainCRMPage();
        });*/
    });
  })

  };

  render() {
    return (
      <div>
        <Header logo="assets/odoo.png" title="" message={"Please login"} />
        <div className="page">
        <TextField
          className="form-line"
          label="Server"
          defaultValue={this.state.baseURL}
          onChange={this.onServerChange}
        />
        <PrimaryButton className="form-line full-width" text="Login" onClick={this.login} />
        </div>
      </div>
    );
  }
}

export default Login;
