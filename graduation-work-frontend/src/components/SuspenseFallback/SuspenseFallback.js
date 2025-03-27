import React from 'react';
import { Spinner } from "react-bootstrap";
import { SuspenseContainer } from './SuspenseFallback.style'

export const SuspenseFallback = () => {
    return (
        <SuspenseContainer>
            <Spinner animation="border" />
        </SuspenseContainer>
    );
}