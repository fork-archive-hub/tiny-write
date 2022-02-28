import styled from '@emotion/styled'
import {background, foreground, primary, font} from '../config'

export const Layout = styled.div`
  display: flex;
  background: ${props => background(props.theme)};
  width: 100%;
  height: 100%;
  font-family: ${props => font(props.theme)};
  font-size: 18px;
  color: ${props => foreground(props.theme)};
  display: ${props => props.hidden ? 'none' : 'flex'};
  position: relative;
  .drop-cursor {
    background: ${props => primary(props.theme)} !important;
    height: 2px !important;
    opacity: 0.5;
  }
`
