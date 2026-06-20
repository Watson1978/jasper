import React, {CSSProperties} from 'react';
import styled from 'styled-components';

type Props = {
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}

type State = {
}

export class DraggableHeader extends React.Component<Props, State> {
  private handleMaximize(ev: React.MouseEvent) {
    // ルート要素そのものをダブルクリックした場合のみ最大化する（子要素は除外）
    if (ev.target === ev.currentTarget) {
      window.ipc.mainWindow.toggleMaximizeWindow();
    }
  }

  render() {
    return (
      <Root
        className={this.props.className}
        style={this.props.style}
        onDoubleClick={(ev) => this.handleMaximize(ev)}
      >
        {this.props.children}
      </Root>
    );
  }
}

const Root = styled.div`
  display: flex;
  flex-direction: row;
  box-sizing: border-box;
  min-height: 63px;
  align-items: center;
  width: 100%;
  
  -webkit-app-region: drag;
  
  & > * {
    -webkit-app-region: none;
  }
`;
