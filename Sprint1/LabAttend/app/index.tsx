import React from 'react';
import { useLab } from '../src/state/LabContext';
import Welcome from '../src/screens/Welcome';
import Main from '../src/screens/Main';
export default function Index() { const { identity } = useLab(); return identity ? <Main /> : <Welcome />; }
