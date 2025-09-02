import { Component } from "react"

class ToggleKeyword extends Component {
    state = {
        toggled: false
    };

    handle_toggle = () => {
        this.setState({
            age: !this.state.toggled
        });
    };

    render() {
        const className = 'button' + this.props.keyword;

        return(
            <button className={className}>
                {this.props.title}
            </button>
        );
    }
}

export default ToggleKeyword