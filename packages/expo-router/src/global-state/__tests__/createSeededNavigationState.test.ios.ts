import type { RouteNode } from '../../Route';
import { createSeededRootState } from '../createSeededNavigationState';

jest.mock('nanoid/non-secure', () => {
  let id = 0;
  return { nanoid: () => `test-${++id}` };
});

function node(route: string, children: RouteNode[] = [], initialRouteName?: string): RouteNode {
  return {
    type: 'route',
    route,
    children,
    initialRouteName,
    dynamic: null,
    contextKey: route,
    loadRoute: () => ({}),
  };
}

function expectCompleteState(state: object) {
  expect(state).toMatchObject({
    stale: false,
    key: expect.any(String),
    index: expect.any(Number),
    routeNames: expect.any(Array),
    routes: expect.any(Array),
  });

  for (const route of (state as { routes: { key?: string; state?: object }[] }).routes) {
    expect(route.key).toEqual(expect.any(String));
    if (route.state) {
      expectCompleteState(route.state);
    }
  }
}

test('completes nested parsed routes without dropping anchor or dynamic params', () => {
  const routeNode = node('root', [
    node('index'),
    node('(group)', [node('[id]', [node('details')]), node('anchor')], 'anchor'),
  ]);

  const state = createSeededRootState(
    {
      routes: [
        {
          name: '__root',
          state: {
            routes: [
              {
                name: '(group)',
                params: { section: 'fruit' },
                state: {
                  index: 99,
                  routes: [
                    { name: 'anchor', params: { from: 'link' } },
                    {
                      name: '[id]',
                      params: { id: '42' },
                      state: {
                        routes: [
                          {
                            name: 'details',
                            params: { tab: 'info' },
                            path: '/fruit/42',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    routeNode
  );

  expectCompleteState(state);
  expect(state.routes[0]!.state).toMatchObject({
    routeNames: ['index', '(group)'],
    routes: [
      {
        name: '(group)',
        params: { section: 'fruit' },
        state: {
          index: 1,
          routeNames: ['anchor', '[id]'],
          routes: [
            { name: 'anchor', params: { from: 'link' } },
            {
              name: '[id]',
              params: { id: '42' },
              state: {
                routeNames: ['details'],
                routes: [{ name: 'details', params: { tab: 'info' }, path: '/fruit/42' }],
              },
            },
          ],
        },
      },
    ],
  });
  expect(JSON.stringify(state)).not.toContain('__internal__routerActionState');
  expect(JSON.stringify(state)).not.toContain('"type"');
});

test('filters unknown routes and falls back to the configured initial route', () => {
  const routeNode = node('root', [node('alpha'), node('beta')], 'beta');

  const state = createSeededRootState(
    {
      routes: [
        {
          name: '__root',
          state: {
            index: -10,
            routes: [{ name: 'unknown', state: { routes: [{ name: 'leaked' }] } }],
          },
        },
      ],
    },
    routeNode
  );

  expect(state.routes[0]!.state).toMatchObject({
    index: 0,
    routeNames: ['beta', 'alpha'],
    routes: [{ name: 'beta', key: expect.any(String) }],
  });
  expect(JSON.stringify(state)).not.toContain('leaked');
});

test('preserves the focused route when filtering unknown routes', () => {
  const routeNode = node('root', [node('alpha'), node('beta')]);

  const state = createSeededRootState(
    {
      routes: [
        {
          name: '__root',
          state: {
            index: 1,
            routes: [{ name: 'unknown' }, { name: 'alpha' }, { name: 'beta' }],
          },
        },
      ],
    },
    routeNode
  );

  expect(state.routes[0]!.state).toMatchObject({
    index: 0,
    routes: [{ name: 'alpha' }, { name: 'beta' }],
  });
});

test('preserves the focused occurrence of a duplicate route', () => {
  const state = createSeededRootState(
    {
      routes: [
        {
          name: '__root',
          state: {
            index: 1,
            routes: [{ name: 'alpha' }, { name: 'alpha' }],
          },
        },
      ],
    },
    node('root', [node('alpha')])
  );

  expect(state.routes[0]!.state).toMatchObject({
    index: 1,
    routes: [{ name: 'alpha' }, { name: 'alpha' }],
  });
});

test('returns the default root state for an empty or unknown parse', () => {
  const routeNode = node('root', [node('index')]);

  expect(createSeededRootState(undefined, routeNode)).toMatchObject({
    index: 0,
    routeNames: ['__root', '+not-found', '_sitemap'],
    routes: [{ name: '__root', key: expect.any(String) }],
  });
  expect(createSeededRootState({ routes: [{ name: 'unknown' }] }, routeNode)).toMatchObject({
    index: 0,
    routeNames: ['__root', '+not-found', '_sitemap'],
    routes: [{ name: '__root', key: expect.any(String) }],
  });
});

test.each(['+not-found', '_sitemap'])('keeps the root %s route as a leaf', (name) => {
  const state = createSeededRootState(
    {
      routes: [
        {
          name,
          path: '/special',
          params: { requested: '/missing' },
          state: { routes: [{ name: 'invalid-child' }] },
        },
      ],
    },
    node('root', [node('index')])
  );

  expect(state.routes).toEqual([
    {
      key: expect.any(String),
      name,
      path: '/special',
      params: { requested: '/missing' },
    },
  ]);
});
