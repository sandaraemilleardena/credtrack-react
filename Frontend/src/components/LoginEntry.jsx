import {useLayoutEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {enterLoginScreen} from '../auth/session';

export default function LoginEntry({children}) {
  const {key, pathname} = useLocation();
  useLayoutEffect(() => {enterLoginScreen();}, [key, pathname]);
  return children;
}
