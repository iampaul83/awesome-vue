import fetch from 'isomorphic-fetch';
import { GraphQLClient } from 'graphql-request';

const GITHUB_V4 = 'https://api.github.com/graphql';

const client = new GraphQLClient(GITHUB_V4, {
  headers: { Authorization: `bearer ${process.env.GITHUB_API_KEY}` },
});

// getStarsOfRepo('monterail', 'vue-multiselect')
//   .then((data: any) => console.log(data))
//   .catch(error => {
//     console.log(error.name);
//     console.log(error);
//   });

// fetch('https://github.com/monterail/vue-multiselect', {
//   redirect: 'manual',
// })
//   .then(res => {
//     console.log(res.status);
//     console.log(res.headers.get('location'));
//   })
//   .catch(error => console.error(error));

function _getStarsOfRepo(owner: string, name: string) {
  return client.request(
    /* GraphQL */ `
      query GetStarsOfRepo($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          stargazers {
            totalCount
          }
        }
      }
    `,
    {
      owner: owner,
      name: name,
    }
  );
}

async function getStarsOfRepo(owner: string, name: string) {
  let data: any;
  let newUrl: string | null = null;
  try {
    data = await _getStarsOfRepo(owner, name);
  } catch (error) {
    try {
      if (error.response.errors[0].type !== 'NOT_FOUND') {
        throw error;
      }

      const res = await fetch(`https://github.com/${owner}/${name}`, {
        redirect: 'manual',
      });
      if (res.status !== 301) throw new Error();
      newUrl = res.headers.get('location')!;
      const match = newUrl!.match(`https://github.com/([^/]+)/([^/]+)/?$`);
      const [_, newOwner, newName] = match!;

      data = await _getStarsOfRepo(newOwner, newName);

      // console.log(`${owner}/${name} -> ${newOwner}/${newName}`);
    } catch (error2) {
      throw error;
    }
  }

  return {
    stars: data.repository.stargazers.totalCount,
    newUrl: newUrl,
  };
}

export default getStarsOfRepo;
