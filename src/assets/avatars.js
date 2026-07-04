// 25 Tech-themed avatars from public/avatars folder with correct extensions
export const avatars = [
  { id: 1, name: "Avatar 1", url: "/avatars/1.jpg" },
  { id: 2, name: "Avatar 2", url: "/avatars/2.jpg" },
  { id: 3, name: "Avatar 3", url: "/avatars/3.jpg" },
  { id: 4, name: "Avatar 4", url: "/avatars/4.jpg" },
  { id: 5, name: "Avatar 5", url: "/avatars/5.jpg" },
  { id: 6, name: "Avatar 6", url: "/avatars/6.jpg" },
  { id: 7, name: "Avatar 7", url: "/avatars/7.jpg" },
  { id: 8, name: "Avatar 8", url: "/avatars/8.jpg" },
  { id: 9, name: "Avatar 9", url: "/avatars/9.jpg" },
  { id: 10, name: "Avatar 10", url: "/avatars/10.jpg" },
  { id: 11, name: "Avatar 11", url: "/avatars/11.jpg" },
  { id: 12, name: "Avatar 12", url: "/avatars/12.jpg" },
  { id: 13, name: "Avatar 13", url: "/avatars/13.jpg" },
  { id: 14, name: "Avatar 14", url: "/avatars/14.jpg" },
  { id: 15, name: "Avatar 15", url: "/avatars/15.jpg" },
  { id: 16, name: "Avatar 16", url: "/avatars/16.jpg" },
  { id: 17, name: "Avatar 17", url: "/avatars/17.jpg" },
  { id: 18, name: "Avatar 18", url: "/avatars/18.avif" },
  { id: 19, name: "Avatar 19", url: "/avatars/19.avif" },
  { id: 20, name: "Avatar 20", url: "/avatars/20.avif" },
  { id: 21, name: "Avatar 21", url: "/avatars/21.avif" },
  { id: 22, name: "Avatar 22", url: "/avatars/22.avif" },
  { id: 23, name: "Avatar 23", url: "/avatars/23.avif" },
  { id: 24, name: "Avatar 24", url: "/avatars/24.jpg" },
  { id: 25, name: "Avatar 25", url: "/avatars/25.jpg" }
];

// Utility function to get a random avatar
export const getRandomAvatar = () => {
  const randomIndex = Math.floor(Math.random() * avatars.length);
  return avatars[randomIndex];
};

// Utility function to get avatar by ID
export const getAvatarById = (id) => {
  return avatars.find(avatar => avatar.id === id) || avatars[0];
};

