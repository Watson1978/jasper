import React from 'react';
import styled from 'styled-components';
import {AppEvent} from '../../Event/AppEvent';
import {PlatformUtil} from '../Util/PlatformUtil';
import {TimerUtil} from '../Util/TimerUtil';

type Props = {
}

type State = {
  show: boolean;
}

export class TrafficLightsSpace extends React.Component<Props, State> {
  state: State = {
    show: false,
  }

  private readonly rootRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    this.handlePosition();
    AppEvent.onChangedLayout(this, () => this.handlePosition());
  }

  componentWillUnmount() {
    AppEvent.offAll(this);
  }

  private async handlePosition() {
    await TimerUtil.sleep(16);
    const el = this.rootRef.current?.parentElement as HTMLElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width && rect.left < TrafficLightSize.width) {
      this.setState({show: true});
    } else {
      this.setState({show: false});
    }
  }

  private handleMaximize() {
    window.ipc.mainWindow.toggleMaximizeWindow();
  }

  render() {
    const display = PlatformUtil.isMac() && this.state.show ? 'block' : 'none';
    return (
      <Root ref={this.rootRef} style={{display}} onDoubleClick={() => this.handleMaximize()}/>
    );
  }
}

const TrafficLightSize = {
  width: 70,
  height: 24,
};

const Root = styled.div`
  -webkit-app-region: drag;
  width: ${TrafficLightSize.width}px;
  height: ${TrafficLightSize.height}px;
`;
