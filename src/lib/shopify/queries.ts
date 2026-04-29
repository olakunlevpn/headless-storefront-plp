export const COLLECTION_QUERY = /* GraphQL */ `
  query CollectionPLP($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      id
      title
      handle
      products(first: $first) {
        nodes {
          id
          handle
          title
          featuredImage {
            url
            altText
            width
            height
          }
          options {
            name
            values
          }
          variants(first: 100) {
            nodes {
              id
              title
              availableForSale
              selectedOptions {
                name
                value
              }
              price {
                amount
                currencyCode
              }
              image {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    }
  }
`;
