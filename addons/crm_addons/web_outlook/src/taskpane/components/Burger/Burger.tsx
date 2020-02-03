import * as React from "react";

import "./Burger.css";

import { Link } from "office-ui-fabric-react";
export interface IBurgerEntry {
    Title: string;
    OnClick: any;
}
type BurgerProps = {
    entries: IBurgerEntry[]
 };
type BurgerState = { };

class Burger extends React.Component<BurgerProps, BurgerState> {
  constructor(props) {
    super(props);
    this.state = { };
  }

  render() {
    const entryList = this.props.entries.map((item) => <li><Link onClick={item.OnClick}>{item.Title}</Link></li>)
    return (
        <div>
            <div className="burger-placeholder"></div>
            <nav role='navigation'>
                <div id="burger-toggle">
                    <input type="checkbox" />
                    <span></span>
                    <span></span>
                    <span></span>

                    <ul id="burger">
                        {entryList}
                    </ul>
                </div>
            </nav>
        </div>
    );
  }
}

export default Burger;
