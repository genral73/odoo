// TODO: without table

import * as React from "react";
import "./InfoBubble.css";

type InfoBubbleProps = {
  info: Map<string, string>
};
type InfoBubbleState = {};

class InfoBubble extends React.Component<InfoBubbleProps, InfoBubbleState> {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    if (this.props.info.size == 0) {
      return (<div className="info-bubble">
        <div className="info-bubble-title">Additional information</div>
        <table>
          <tbody>
            <tr>
              <td>No data</td>
            </tr>
          </tbody>
        </table>
      </div>);
    }   

    const infoLines = []
    this.props.info.forEach((value, key) => infoLines.push(<tr><td>{key}</td><td>{value}</td></tr>))

    return (
      <div className="info-bubble">
        <div className="info-bubble-title">Additional information</div>
        <table>
          <tbody>
            {infoLines}
          </tbody>
        </table>
      </div>
    );
  }
}

export default InfoBubble;
