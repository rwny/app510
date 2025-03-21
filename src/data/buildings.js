// Building and room data file
// This can be expanded to include multiple buildings and more rooms

// Building structure:
// - Each building has an ID, name, and floors
// - Each floor has an ID, name, and rooms
// - Each room has an ID

const buildings = [
  {
    id: 'AR15',
    name: 'shop ดำ',
    floors: [
      {
        id: 1,
        name: 'ชั้น 1',
        rooms: [
          { id: '101' },
          { id: '102' },
        ]
      },
      {
        id: 2,
        name: 'ชั้น 2',
        rooms: [
          { id: '201' },
          { id: '202' },
          { id: '203' },
          { id: '204' },
          { id: '205' },
          { id: '206' },
        ]
      }
    ]
  },
  // You can add more buildings here following the same structure
  // {
  //   id: 'AR16',
  //   name: 'อาคารสำนักงาน',
  //   floors: [
  //     {
  //       id: 1,
  //       name: 'ชั้น 1',
  //       rooms: [
  //         { id: '101' },
  //         { id: '102' },
  //       ]
  //     }
  //   ]
  // }
];

// Export the buildings array as the default export
export default buildings;

// Export helper functions to access building data
export const getBuilding = (buildingId) => {
  return buildings.find(building => building.id === buildingId);
};

export const getAllFloors = (buildingId) => {
  const building = getBuilding(buildingId);
  return building ? building.floors : [];
};

export const getAllRooms = (buildingId) => {
  const building = getBuilding(buildingId);
  if (!building) return [];
  
  return building.floors.flatMap(floor => floor.rooms);
};
