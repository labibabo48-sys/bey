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

    const httpLink = new BatchHttpLink({
        uri: "/api/graphql",
        batchInterval: 50, // Increased from 20ms to 50ms to batch more requests
        batchMax: 10, // Maximum of 10 queries per batch
    });

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
