import * as React from "react";
import Login from "./Login/Login"
import Progress from "./Progress";
import Main from "./Main/Main";

enum Page {
  Login,
  Main
}

export interface AppProps {
  title: string;
  isOfficeInitialized: boolean;
}

export interface AppState {
  pageDisplayed: Page;
  isLoading: Boolean;
  loginErrorMessage: string;
}

export default class App extends React.Component<AppProps, AppState> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      isLoading: false,
      pageDisplayed: localStorage.getItem('token') ? Page.Main : Page.Login,
      loginErrorMessage: ""
    };
  }

  componentDidMount() {
    this.setState({
      isLoading: false,
    });
  }

  logout = (errorMessage: string) => {
    localStorage.removeItem("token");
    this.setState({
      pageDisplayed: Page.Login,
      loginErrorMessage: errorMessage
    })
  }

  goToMain = () => {
    this.setState({
      pageDisplayed: Page.Main
    })
  }

  render() {
    const { title, isOfficeInitialized } = this.props;

    if (!isOfficeInitialized) {
      return (
        <Progress title={title} logo="assets/logo-filled.png" message="Please sideload your addin to see app body." />
      );
    }

    switch (this.state.pageDisplayed){
      case Page.Main:
        return <Main logout={this.logout} />;
      case Page.Login:
      default:
        return <Login goToMain={this.goToMain} />
    }
  }
}
