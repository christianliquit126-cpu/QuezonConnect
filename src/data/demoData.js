export const DEMO_POSTS = [
  {
    postId: 'post-001',
    uid: 'demo-user-002',
    userName: 'Maria Santos',
    userAvatar: 'https://ui-avatars.com/api/?name=Maria+Santos&background=10b981&color=fff',
    userLocation: 'Barangay North Fairview',
    content: 'Our family received groceries from the community food drive today. We are so grateful for everyone who donated. This community is truly amazing! 🙏',
    imageURL: null,
    category: 'Food & Groceries',
    likes: 24,
    commentCount: 5,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    liked: false,
  },
  {
    postId: 'post-002',
    uid: 'demo-user-003',
    userName: 'Juan dela Cruz',
    userAvatar: 'https://ui-avatars.com/api/?name=Juan+Cruz&background=f59e0b&color=fff',
    userLocation: 'Barangay Payatas',
    content: 'Offering free tutoring sessions for elementary and high school students every Saturday, 9AM-12NN at Payatas Community Center. All subjects covered. Let\'s help our children succeed! 📚',
    imageURL: null,
    category: 'School & Supplies',
    likes: 41,
    commentCount: 12,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    liked: false,
  },
  {
    postId: 'post-003',
    uid: 'demo-user-004',
    userName: 'Dr. Ana Reyes',
    userAvatar: 'https://ui-avatars.com/api/?name=Ana+Reyes&background=8b5cf6&color=fff',
    userLocation: 'La Mesa Eco Park',
    content: 'FREE medical check-up this Saturday, August 3 at Barangay North Fairview Covered Court, 8AM-12NN. No appointment needed. Services include: blood pressure, blood sugar, basic consultation. Please spread the word! 🏥',
    imageURL: null,
    category: 'Health & Medical',
    likes: 89,
    commentCount: 23,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    liked: false,
  },
  {
    postId: 'post-004',
    uid: 'demo-user-005',
    userName: 'Pedro Villanueva',
    userAvatar: 'https://ui-avatars.com/api/?name=Pedro+Villanueva&background=ef4444&color=fff',
    userLocation: 'Commonwealth Ave',
    content: 'Community Clean-up Drive this Sunday at La Mesa Eco Park, 6AM. Volunteers needed! Bring your gloves and let\'s keep our community beautiful. Snacks will be provided. 🌿',
    imageURL: null,
    category: 'Community Events',
    likes: 57,
    commentCount: 18,
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    liked: false,
  },
]

export const DEMO_HELP_REQUESTS = [
  {
    requestId: 'req-001',
    uid: 'demo-user-006',
    userName: 'Rosa Mendoza',
    userAvatar: 'https://ui-avatars.com/api/?name=Rosa+Mendoza&background=0ea5e9&color=fff',
    title: 'School supplies needed for two children',
    description: 'I am a single mother of two school-age children. We urgently need school supplies — notebooks, pens, crayons, and a backpack each. Any help will be greatly appreciated.',
    category: 'School & Supplies',
    location: 'Barangay Payatas',
    status: 'pending',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    requestId: 'req-002',
    uid: 'demo-user-007',
    userName: 'Ernesto Bautista',
    userAvatar: 'https://ui-avatars.com/api/?name=Ernesto+Bautista&background=f97316&color=fff',
    title: 'Need medical assistance for elderly mother',
    description: 'My 75-year-old mother needs regular medication for hypertension and diabetes. We cannot afford both medications this month and need some assistance.',
    category: 'Health & Medical',
    location: 'Barangay Batasan Hills',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    requestId: 'req-003',
    uid: 'demo-user-008',
    userName: 'Lourdes Garcia',
    userAvatar: 'https://ui-avatars.com/api/?name=Lourdes+Garcia&background=22c55e&color=fff',
    title: 'Food assistance for flood-affected family',
    description: 'Our home was flooded last week and we lost most of our food supply. A family of 5 needs food assistance for the next two weeks while we recover.',
    category: 'Food & Groceries',
    location: 'Barangay Holy Spirit',
    status: 'completed',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
]

export const DEMO_VOLUNTEERS = [
  { uid: 'v-001', name: 'Dr. Ana Reyes', avatar: 'https://ui-avatars.com/api/?name=Ana+Reyes&background=8b5cf6&color=fff', skill: 'Medical Professional', online: true, helpCount: 32 },
  { uid: 'v-002', name: 'Teacher Mia Cruz', avatar: 'https://ui-avatars.com/api/?name=Mia+Cruz&background=2563eb&color=fff', skill: 'Education', online: true, helpCount: 28 },
  { uid: 'v-003', name: 'Ben Torres', avatar: 'https://ui-avatars.com/api/?name=Ben+Torres&background=10b981&color=fff', skill: 'Food & Relief', online: false, helpCount: 19 },
  { uid: 'v-004', name: 'Carla Dim', avatar: 'https://ui-avatars.com/api/?name=Carla+Dim&background=f59e0b&color=fff', skill: 'Transportation', online: true, helpCount: 15 },
]

export const DEMO_UPDATES = [
  { id: 'u-001', type: 'NEW', title: 'Mobile Medical Clinic', description: 'Free check-up this Saturday at Barangay North Fairview, 8AM-12NN.', time: 'Today', location: 'Barangay North Fairview' },
  { id: 'u-002', type: 'NEED', title: 'Donations Needed', description: 'Family needs clothes and school supplies for two children.', time: '2 hours ago', location: 'Barangay Payatas' },
  { id: 'u-003', type: 'EVENT', title: 'Community Clean-up Drive', description: 'Volunteers needed this Sunday at La Mesa Eco Park, 6AM.', time: '1 day ago', location: 'La Mesa' },
]

export const DEMO_COMMENTS = {
  'post-001': [
    { commentId: 'c-001', uid: 'demo-user-009', userName: 'Ben Torres', userAvatar: 'https://ui-avatars.com/api/?name=Ben+Torres&background=10b981&color=fff', content: 'So happy to hear this! Keep it up community! 💙', createdAt: new Date(Date.now() - 90 * 60 * 1000) },
    { commentId: 'c-002', uid: 'demo-user-010', userName: 'Carla Dim', userAvatar: 'https://ui-avatars.com/api/?name=Carla+Dim&background=f59e0b&color=fff', content: 'Glad the food drive helped your family!', createdAt: new Date(Date.now() - 60 * 60 * 1000) },
  ],
}

export const DEMO_CHATS = [
  {
    chatId: 'chat-001',
    participantId: 'demo-user-002',
    participantName: 'Maria Santos',
    participantAvatar: 'https://ui-avatars.com/api/?name=Maria+Santos&background=10b981&color=fff',
    online: true,
    lastMessage: 'Thank you so much for your help!',
    lastTime: new Date(Date.now() - 30 * 60 * 1000),
    unread: 2,
  },
  {
    chatId: 'chat-002',
    participantId: 'demo-user-003',
    participantName: 'Juan dela Cruz',
    participantAvatar: 'https://ui-avatars.com/api/?name=Juan+Cruz&background=f59e0b&color=fff',
    online: false,
    lastMessage: 'When are you available for the tutoring?',
    lastTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unread: 0,
  },
]

export const DEMO_MESSAGES = {
  'chat-001': [
    { msgId: 'm-001', uid: 'demo-user-002', content: 'Hi! I saw your offer to help with groceries.', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { msgId: 'm-002', uid: 'demo-user-001', content: 'Yes! Happy to help. What do you need?', timestamp: new Date(Date.now() - 100 * 60 * 1000) },
    { msgId: 'm-003', uid: 'demo-user-002', content: 'We mostly need rice, canned goods, and cooking oil.', timestamp: new Date(Date.now() - 90 * 60 * 1000) },
    { msgId: 'm-004', uid: 'demo-user-001', content: "I'll arrange that for you. I can drop it off tomorrow morning.", timestamp: new Date(Date.now() - 80 * 60 * 1000) },
    { msgId: 'm-005', uid: 'demo-user-002', content: 'Thank you so much for your help!', timestamp: new Date(Date.now() - 30 * 60 * 1000) },
  ],
}
