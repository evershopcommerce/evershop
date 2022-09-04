import React from 'react';
import Area from '../../../../../lib/components/Area';

export default function PeopleListing({ allPeople: { people } }) {
  return <div>
    <ul>
      {
        people.map((p) => <li key={p.id}>
          <Area
            id="people-list-item"
            people={p}
            coreComponents={[
              {
                id: "people-item-name",
                sortOrder: 1,
                component: {
                  default: () => <div>{p.name}</div>
                }
              }
            ]}
          />
        </li>)
      }
    </ul>
  </div>
}

export const query = `
  query {
    allPeople  {
      people {
        name
        id
        birthYear
      }
    }
  }
`;

export const layout = {
  areaId: "content",
  sortOrder: 1
}
