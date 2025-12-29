import { ApolloClient, InMemoryCache, ApolloLink } from "@apollo/client";
import { BatchHttpLink } from "@apollo/client/link/batch-http";
import { setContext } from "@apollo/client/link/context";

const createApolloClient = () => {
    const authLink = setContext((_, { headers }) => {
        // Get user name from local storage
        let userName = "";
        if (typeof window !== "undefined") {
            try {
                const stored = window.localStorage.getItem("business_bey_user");
                if (stored) {
                    const user = JSON.parse(stored);
                    userName = user.name || user.username || "";
                }
            } catch (e) { }
        }

        return {
            headers: {
                ...headers,
                "x-user-done": userName,
            }
        }
    });

    const getUri = () => {
        if (typeof window !== "undefined") return "/api/graphql";
        // On server, we need absolute URL. Default to localhost for dev.
        return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000") + "/api/graphql";
    };

    const httpLink = new ApolloLink((operation, forward) => {
        // Fallback to regular Fetch if Batching is not needed or causing issues
        const uri = getUri();
        operation.setContext({ uri });
        return forward(operation);
    }).concat(new BatchHttpLink({
        uri: typeof window !== "undefined" ? "/api/graphql" : "http://localhost:3000/api/graphql",
        batchInterval: 50,
        batchMax: 10,
    }));

    return new ApolloClient({
        link: authLink.concat(httpLink),
        cache: new InMemoryCache({
            typePolicies: {
                Query: {
                    fields: {
                        personnelStatus: {
                            keyArgs: ["date"],
                            merge(existing, incoming) {
                                return incoming;
                            },
                        },
                        getAdvances: {
                            keyArgs: ["month"],
                            merge(existing, incoming) {
                                return incoming;
                            },
                        },
                        getPayroll: {
                            keyArgs: ["month"],
                            merge(existing, incoming) {
                                return incoming;
                            },
                        },
                        getRetards: {
                            keyArgs: ["date"],
                            merge(existing, incoming) {
                                return incoming;
                            },
                        },
                        getAbsents: {
                            keyArgs: ["date"],
                            merge(existing, incoming) {
                                return incoming;
                            },
                        },
                        getExtras: {
                            keyArgs: ["month"],
                            merge(existing, incoming) {
                                return incoming;
                            },
                        },
                    },
                },
            },
        }),
        defaultOptions: {
            watchQuery: {
                fetchPolicy: 'cache-and-network',
                nextFetchPolicy: 'cache-first',
                errorPolicy: 'all',
            },
            query: {
                fetchPolicy: 'cache-first',
                errorPolicy: 'all',
            },
        },
    });
};

export default createApolloClient;
