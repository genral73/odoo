import * as React from "react";

export interface HeaderProps {
  title: string;
  logo: string;
  message: string;
}

export default class Header extends React.Component<HeaderProps> {
  render() {
    //const { title, logo, message } = this.props;
//<img width="90" height="90" src={logo} alt={title} title={title} />
    return (
      <section className="ms-welcome__header ms-bgColor-neutralLighter ms-u-fadeIn500">
        <h1 className="ms-fontSize-su ms-fontWeight-light ms-fontColor-neutralPrimary">{this.props.message}</h1>
      </section>
    );
  }
}
