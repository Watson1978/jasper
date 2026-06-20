import React, {CSSProperties} from 'react';
import styled from 'styled-components';

type Props = {
  onClick?: (ev: React.MouseEvent) => void;
  onDoubleClick?: (ev: React.MouseEvent) => void;
  onContextMenu?: (ev: React.MouseEvent) => void;
  className?: string;
  style?: CSSProperties;
  title?: string;
  // React 19 で findDOMNode が削除されたため、ルートDOMノードへの参照を受け取れるようにする
  rootRef?: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
}

type State = {
}

export class ClickView extends React.Component<Props, State> {
  private handleContextMenu(ev: React.MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.onContextMenu?.(ev);
  }

  private handleClick(ev: React.MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.onClick?.(ev);
  }

  private handleDoubleClick(ev: React.MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.onDoubleClick?.(ev);
  }

  render() {
    return (
      <Root
        ref={this.props.rootRef}
        title={this.props.title}
        onClick={this.handleClick.bind(this)}
        onDoubleClick={this.handleDoubleClick.bind(this)}
        className={this.props.className}
        style={this.props.style}
        onContextMenu={this.handleContextMenu.bind(this)}
      >
        {this.props.children}
      </Root>
    );
  }
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  cursor: pointer;
  
  & * {
    cursor: pointer;
  }
`;
