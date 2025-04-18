import { lazy } from "react";
import { Route, Switch, BrowserRouter, Redirect } from "react-router-dom";

const Main = lazy(() => import('../pages/main'));
const Login = lazy(() => import('../pages/login'));

class RouteItem {
    constructor(path, key, exact, component, routes) {
        this.path = path;
        this.key = key;
        this.exact = exact;
        this.component = component;
        this.routes = routes;
    }
}

class Routes {
    constructor() {
        this.routes = [
            new RouteItem("/main", "MAIN", true, Main, []),
            new RouteItem("/login", "LOGIN", true, Login, []),
            // Add more routes here as needed.
        ];
    }

    get allRoutes() {
        return this.routes;
    }
}

const ROUTES = new Routes();

export default ROUTES;

export function RenderRoutes({ routes }) {
    return (
        <BrowserRouter>
            <Switch>
                {routes.map((route, i) => {
                    console.log(route.path);
                    return (
                        <RouteWithSubRoutes
                            key={route.key}
                            path={route.path}
                            exact={route.exact}
                            component={route.component}
                            routes={route.routes}
                        />
                    );
                })}
                <Route exact path="/" render={() => (<Redirect to="/login" />)} />
                <Route component={() => <h1>Not Found!</h1>} />
            </Switch>
        </BrowserRouter>
    );
}

function RouteWithSubRoutes(route) {
    return (
        <Route
            key={route.key}
            path={route.path}
            exact={route.exact}
            render={props => <route.component {...props} routes={route.routes} />}
        />
    );
}
