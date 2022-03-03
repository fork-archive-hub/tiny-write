import {css} from '@emotion/react'
import styled from '@emotion/styled'
import {foreground, primaryBackground, primaryForeground, font} from '../config'

export const Common = css`
  height: 50px;
  padding: 0 20px;
  border-radius: 30px;
  font-size: 18px;
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  outline: none;
  text-decoration: none;
  font-family: 'JetBrains Mono';
  &:hover {
    opacity: 0.8;
  }
`

export const Button = styled.button`
  ${Common}
  background: none;
  font-family: ${props => font(props.theme)};
  color: ${props => foreground(props.theme)};
  border: 1px solid ${props => foreground(props.theme)};
`

export const ButtonPrimary = styled.button`
  ${Common}
  color: ${props => primaryForeground(props.theme)};
  border: 0;
  background: ${props => primaryBackground(props.theme)};
`
