import { ESLintUtils, TSESTree } from '@typescript-eslint/experimental-utils';
import { getDocsUrl, ALL_QUERIES_METHODS } from '../utils';
import { isMemberExpression } from '../node-utils';

export const RULE_NAME = 'prefer-explicit-assert';
export type MessageIds =
  | 'preferExplicitAssert'
  | 'preferExplicitAssertAssertion';
type Options = [
  {
    assertion?: string;
    customQueryNames?: string[];
  }
];

const ALL_GET_BY_QUERIES = ALL_QUERIES_METHODS.map(
  queryMethod => `get${queryMethod}`
);

const isValidQuery = (node: TSESTree.Identifier, customQueryNames: string[]) =>
  ALL_GET_BY_QUERIES.includes(node.name) ||
  customQueryNames.includes(node.name);

const isAtTopLevel = (node: TSESTree.Node) =>
  node.parent.parent.type === 'ExpressionStatement';

export default ESLintUtils.RuleCreator(getDocsUrl)<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest using explicit assertions rather than just `getBy*` queries',
      category: 'Best Practices',
      recommended: false,
    },
    messages: {
      preferExplicitAssert:
        'Wrap stand-alone `getBy*` query with `expect` function for better explicit assertion',
      preferExplicitAssertAssertion:
        '`getBy*` queries must be asserted with `{{assertion}}`',
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          assertion: {
            type: 'string',
          },
          customQueryNames: {
            type: 'array',
          },
        },
      },
    ],
  },
  defaultOptions: [
    {
      customQueryNames: [],
    },
  ],

  create: function(context, [options]) {
    const { customQueryNames, assertion } = options;
    const getQueryCalls: TSESTree.Identifier[] = [];

    return {
      'CallExpression Identifier'(node: TSESTree.Identifier) {
        if (isValidQuery(node, customQueryNames)) {
          getQueryCalls.push(node);
        }
      },
      'Program:exit'() {
        getQueryCalls.forEach(queryCall => {
          const node = isMemberExpression(queryCall.parent)
            ? queryCall.parent
            : queryCall;

          if (isAtTopLevel(node)) {
            context.report({
              node: queryCall,
              messageId: 'preferExplicitAssert',
            });
          } else if (assertion) {
            const expectation = node.parent.parent.parent;

            if (
              expectation.type === 'MemberExpression' &&
              expectation.property.type === 'Identifier' &&
              expectation.property.name !== assertion
            ) {
              context.report({
                node: expectation.property,
                messageId: 'preferExplicitAssertAssertion',
                data: {
                  assertion,
                },
              });
            }
          }
        });
      },
    };
  },
});
