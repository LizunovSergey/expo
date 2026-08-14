import { nanoid } from 'nanoid/non-secure';

import {
  findRouteNodeByName,
  getValidInitialRouteName,
  sortRoutesWithInitial,
  type RouteNode,
} from '../Route';
import { INTERNAL_SLOT_NAME } from '../constants';
import type { ResultState } from '../fork/getStateFromPath';
import { createInitialState } from '../react-navigation/core/createInitialState';
import type { NavigationState, PartialState } from '../react-navigation/routers';
import { getRootStackRouteNames } from './utils';

type SeedState = NavigationState | PartialState<NavigationState>;

export function createSeededRootState(
  targetState: ResultState | undefined,
  rootRouteNode: RouteNode
): NavigationState {
  return createSeededState(targetState, getRootStackRouteNames(), undefined, (routeName) =>
    routeName === INTERNAL_SLOT_NAME ? rootRouteNode : undefined
  );
}

function createSeededNavigationState(
  targetState: SeedState | undefined,
  routeNode: RouteNode
): NavigationState {
  const initialRouteName = getValidInitialRouteName(routeNode);
  const routeNames = [...routeNode.children]
    .sort(sortRoutesWithInitial(initialRouteName))
    .map((child) => child.route);

  return createSeededState(targetState, routeNames, initialRouteName, (routeName) =>
    findRouteNodeByName(routeNode, routeName)
  );
}

function createSeededState(
  targetState: SeedState | undefined,
  routeNames: string[],
  initialRouteName: string | undefined,
  findChildNode: (routeName: string) => RouteNode | undefined
): NavigationState {
  const initialState = createInitialState({ routeNames, initialRouteName });
  const targetRoutes = targetState?.routes ?? [];
  const focusedRoute = targetRoutes[targetState?.index ?? targetRoutes.length - 1];
  const routes = targetRoutes
    .filter((route) => routeNames.includes(route.name))
    .map((targetRoute) => {
      const childNode = findChildNode(targetRoute.name);
      const childState =
        targetRoute.state && childNode
          ? createSeededNavigationState(targetRoute.state, childNode)
          : undefined;

      return {
        key: `${targetRoute.name}-${nanoid()}`,
        name: targetRoute.name,
        ...('path' in targetRoute ? { path: targetRoute.path } : undefined),
        ...('params' in targetRoute ? { params: targetRoute.params } : undefined),
        ...(childState ? { state: childState } : undefined),
      };
    });

  if (routes.length === 0) {
    return initialState;
  }

  const focusedTargetIndex = focusedRoute ? (targetState?.index ?? targetRoutes.length - 1) : -1;
  const focusedIndex = targetRoutes
    .slice(0, focusedTargetIndex + 1)
    .filter((route) => routeNames.includes(route.name)).length;
  const index =
    focusedRoute && routeNames.includes(focusedRoute.name) ? focusedIndex - 1 : routes.length - 1;

  return {
    ...initialState,
    index,
    routes,
  };
}
