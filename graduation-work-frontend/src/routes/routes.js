import React, { Suspense } from "react";
import ROUTES, { RenderRoutes } from "./RenderRoutes";
import SuspenseSpinner from "../components/SuspenseFallback";

export const routes = () => {
    return (
        <Suspense fallback={<SuspenseSpinner />}>
            <RenderRoutes routes={ROUTES.allRoutes} />
        </Suspense>
    )
}