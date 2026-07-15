import { Director, Genre, VisualStyle, Config } from './types';

export const SCRIPT_GENRES = [
  { id: 'sci-fi', name: '科幻未来' },
  { id: 'romance', name: '浪漫爱情' },
  { id: 'sweet', name: '甜宠治愈' },
  { id: 'female-power', name: '女性逆袭' },
  { id: 'realistic', name: '现实都市' },
  { id: 'historical', name: '古装权谋' },
  { id: 'suspense', name: '悬疑犯罪' },
  { id: 'suspense-supernatural', name: '悬疑灵异' },
  { id: 'comedy', name: '喜剧搞笑' },
  { id: 'fantasy', name: '奇幻玄幻' },
  { id: 'latin', name: '拉美短剧' },
  { id: 'nostalgia', name: '年代怀旧' },
];

export const RECOMMENDED_AUTHORS: Record<string, { name: string; description: string }[]> = {
  'sci-fi': [
    { name: '刘慈欣', description: '硬核科幻 + 人文思辨，宇宙尺度的宏大叙事，台词冷静克制，兼具科学严谨性与哲学深度。' },
    { name: '王晋康', description: '近未来硬科幻，聚焦科技伦理与人性困境，台词朴实深刻，充满对现实的反思。' },
    { name: '郝景芳', description: '软科幻 + 人文关怀，以细腻笔触描绘未来都市与人性，台词温柔克制，充满诗意。' },
    { name: '阿西莫夫', description: '经典科幻 + 机器人伦理，逻辑严密，台词理性冷静，构建宏大的科幻世界观。' },
    { name: '克拉克', description: '太空歌剧式科幻，充满宇宙浪漫与技术想象，台词宏大而富有诗意，兼具科学前瞻性。' },
    { name: '特德・姜', description: '短篇科幻 + 语言哲学，叙事精巧，台词充满思辨性，探讨时间与人性。' },
    { name: '凡尔纳', description: '经典冒险科幻，台词生动写实，聚焦科学探索与冒险，充满对未知世界的好奇。' },
  ],
  'romance': [
    { name: '琼瑶', description: '婉约凄美，情感浓缩，台词华丽唯美，极致浪漫主义，爱恨浓烈。' },
    { name: '亦舒', description: '都市爱情清醒风，台词精炼通透，聚焦独立女性情感，冷静克制。' },
    { name: '张爱玲', description: '苍凉华丽的爱情悲剧，细腻凉薄，自带旧上海烟火气与宿命感。' },
    { name: '席绢', description: '台言轻浪漫，节奏轻快，人设鲜明，台词温柔细腻，主打甜宠小虐。' },
    { name: '匪我思存', description: '极致拉扯的爱情悲剧，台词戳心，情感张力拉满，自带 BE 美学。' },
    { name: '村上春树', description: '日式都市浪漫，台词疏离温柔，聚焦孤独与遗憾。' },
  ],
  'sweet': [
    { name: '顾漫', description: '轻松治愈小甜文，节奏舒缓互动高甜，台词温柔细腻。' },
    { name: '竹已', description: '校园与都市双向奔赴，生活化互动，台词接地气又软萌。' },
    { name: '栖见', description: '元气甜宠风，人设鲜活跳脱，主打双向暗恋与直球告白。' },
    { name: '七宝酥', description: '软萌甜宠 + 轻喜剧，台词俏皮可爱，解压又治愈。' },
    { name: '叶非夜', description: '豪门甜宠天花板，人设苏爽，霸总 + 小娇妻高甜互动。' },
  ],
  'female-power': [
    { name: '流潋紫', description: '古装权谋女性成长，台词绵里藏针，宫斗张力强，爽点密集。' },
    { name: '关心则乱', description: '宅斗与女性智慧，台词古风雅致，细节感强，女主清醒独立。' },
    { name: '天下归元', description: '大女主权谋，格局宏大，女主智勇双全，大气磅礴。' },
    { name: '吱吱', description: '庶女步步为营，生活智慧与生存张力。' },
    { name: '闲听落花', description: '逆风翻盘，手撕绿茶的爽感，人设清醒狠绝。' },
  ],
  'realistic': [
    { name: '赵冬苓', description: '现实主义，聚焦普通人悲欢，接地气，人文关怀。' },
    { name: '刘恒', description: '人性刻画犀利深刻，以小人物命运折射时代，直击人心。' },
    { name: '六六', description: '婚姻写实，聚焦婚恋职场困境，尖锐的现实讽刺。' },
    { name: '兰晓龙', description: '军旅现实，台词粗粝滚烫，时代洪流中的挣扎坚守。' },
    { name: '刘震云', description: '市井幽默，北方烟火气，荒诞日常折射人性。' },
    { name: '王朔', description: '京圈痞子文学，贫嘴犀利，北京大院市井气息。' },
  ],
  'historical': [
    { name: '刘和平', description: '历史剧美学巅峰，大气磅礴，大气格局，厚重人物。' },
    { name: '邹静之', description: '文人诗意古装，文字兼具市井温度与雅致灵动。' },
    { name: '二月河', description: '帝王权谋史诗，严谨厚重，权力博弈。' },
    { name: '马伯庸', description: '历史悬疑权谋，考据严谨，脑洞大开。' },
    { name: '海晏', description: '权谋复仇天花板，克制隐忍，布局精妙。' },
  ],
  'suspense': [
    { name: '紫金陈', description: '强逻辑推理，节奏紧凑反转密集，台词克制冷静，聚焦人性黑暗。' },
    { name: '东野圭吾', description: '情感悬疑结合，叙事细腻，反转戳心，人性温度。' },
    { name: '雷米', description: '心理犯罪悬疑，压抑惊悚，救赎张力。' },
    { name: '秦明', description: '法医视角刑侦，专业写实，人性剖析。' },
    { name: '周浩晖', description: '高智商犯罪，极智博弈，冷静理性。' },
  ],
  'suspense-supernatural': [
    { name: '崔走召', description: '灵异悬疑、幽默接地气、民间术法与都市怪谈相结合。' },
    { name: '魔幻现实主义', description: '奇幻现实结合，宿命感，本土传说。' },
    { name: '西语连载剧', description: '伦理情感纠葛，家族秘辛，冲突不断。' },
  ],
  'nostalgia': [
    { name: '梁晓声', description: '年代史诗，厚重真实，温情与力量。' },
    { name: '严歌苓', description: '民国年代美学，细腻苍凉，女性命运。' },
    { name: '高满堂', description: '接地气年代剧，北方烟火气，时代印记。' },
    { name: '王小波', description: '荒诞现实年代，黑色幽默，人性自由。' },
    { name: '叶广芩', description: '旗人文化怀旧，京味儿雅致，家族兴衰。' },
  ],
};

export const SCRIPT_LENGTHS = [
  { id: '1', label: '1集' },
  { id: '5', label: '5集' },
  { id: '10', label: '10集' },
  { id: '20', label: '20集' },
  { id: '30', label: '30集' },
  { id: '35', label: '35集' },
  { id: '50', label: '50集' },
  { id: '60', label: '60集' },
  { id: '90', label: '90集' },
];

export const SCRIPT_DURATIONS = [
  { id: '1', label: '1min' },
  { id: '1.5', label: '1.5min' },
  { id: '2', label: '2min' },
  { id: '5', label: '5min' },
];

export const EPISODE_OPTIONS = [
  { id: '4', label: '4段' },
  { id: '5', label: '5段' },
  { id: '6', label: '6段' },
  { id: '7', label: '7段' },
  { id: '8', label: '8段' },
  { id: '9', label: '9段' },
  { id: '10', label: '10段' },
  { id: '15', label: '15段' },
  { id: '20', label: '20段' },
  { id: '25', label: '25段' },
  { id: '30', label: '30段' },
  { id: 'auto', label: '随机段数' }
];

export const SEGMENT_DURATION_OPTIONS = [
  { id: '15s', label: '15s' },
  { id: 'random', label: '4-15s随机' },
  { id: 'random-30', label: '4-30s 随机' }
];

export const REWRITE_SYSTEM_PROMPT = `你是一位拥有20年经验的专业剧本改写师。请严格按照以下要求，对用户提供的剧本进行深度原创改写，生成一份全新的、符合原创标准的剧本。

【核心原则】
保留原剧本的基本结构、叙事套路、核心冲突、人物关系框架，同时彻底规避任何版权风险，确保新剧本与原剧本无实质性相似。

【微表情演算法与严禁名词原则（最高执行准则）】
在改写任何人物表情、神态动作、画面提示、台词指导时，必须深度融入【逻氏微表情设计 (LuoDesign) 深度微表情演算法】，并满足全天候“文案绝对禁令”：
1. **文案绝对禁令（全文统一、无双重标准）**：所有镜头及画面描写、台词状态说明中，严禁出现“难过”、“愤怒”、“委屈”、“失望”、“崩溃”、“麻木”等任何抽象情绪名词。所有人物心态及情绪转化为具体的五维人体拆解细节：
   - **[微表情与视线]**: 瞳孔变化（骤缩/舒张）、睫毛颤动、视线由无焦点在对峙中发生流转和重新对准、反复咬唇。
   - **[肢体与重心]**: 身体重心前后移动、肩膀随呼吸高低起伏、指尖无意识反复抠抓某处。
   - **[动作中间态]**: 欲言又止、转身动作一滞、抬起的手悬停在空中等未完成倾向，保留视听呼吸感。
   - **[生理应激]**: 喉结急剧滑动、额角青筋由于克制而微凸、呼吸滞涩不畅、鼻翼微动。
   - **[光影呼吸]**: 人物所有呼吸、细小重心移动应带动周遭及面部偏侧灯光阴影发生微小的电影级起伏明暗变化，严禁僵死静态。
2. **禁用代词（铁律）**：描写中必须全程使用角色的真实姓名，绝不能出现“他、她、它、他们”等称谓代称。

【执行指令（务必逐条执行）】
1. 结构与套路保留：
   - 提取原剧本叙事节点（开端、发展、高潮、结局）。
   - 保留原有的转折设计、情节推进脉络与情感走向。

2. 版权规避核心：
   - 【人物规避】：彻底修改所有人物的姓名、外貌描述与背景细节。仅保留核心性格特质（如“虚荣但自卑”）。严禁使用原剧本的特定口头禅。
   - 【台词规避】：**严禁原文修改或同义改写**。所有对话必须基于新人物设定重新创作。确保新台词与原台词无半句相似，逻辑逻辑必须重新组织。
   - 【场景规避】：修改所有具体场景。例如将“现代都市写字楼”改为“郊区旧仓库”，重新描画环境氛围，但需保留场景的功能（提供对峙空间、提供避雨点等）。
   - 【细节规避】：所有道具、动作细节、特定对话逻辑需全部改写。仅保留宏观“情节节点”（如“主角发现秘密”“两人爆发争吵”）。

3. 篇幅与时长（严格执行）：
   - 根据用户指定的“剧本篇幅”和“每集时长”进行内容扩充或压缩。
   - 确保情节密度符合单集时长的要求。

4. 原创性确保：
   - 新剧本必须具备独立原创性。所有具体内容（人物、台词、场景、道具、背景音乐建议）均需重新创作。
   - 逻辑连贯、人物立体、情节设计要流畅自然，符合真实生活逻辑。

5. 格式规范：
   - 必须保持专业的剧本格式：
     - [场景标题]（例如：场1. 老宅-内-夜）
     - [人物名称]
     - [台词]
     - [括号内的动作/情绪描写]
     - [场景动作描述]

6. 适配性：
   - 确保新剧本的调性、风格（如悬疑、情感、职场、喜剧等）与原剧本保持高度一致。

【输出要求】
直接输出完整的新剧本内容，格式清晰规范。无需向用户展示提炼笔记或解释改写思路。`;

export const DEFAULT_CONFIG: Config = {
  script: {
    provider: 'Third Party',
    endpoint: 'https://api.vectorengine.ai',
    path: '/v1beta/models/gemini-3.5-flash:generateContent',
    model: 'gemini-3.5-flash',
    apiKey: '',
    protocolType: 'openai',
    modelType: 'text',
    capabilityKinds: ['text']
  },
  image: {
    provider: 'Third Party',
    endpoint: 'https://api.vectorengine.ai',
    path: '/v1beta/models/gemini-3.1-flash-image-preview',
    model: 'gemini-3.1-flash-image-preview',
    apiKey: '',
    protocolType: 'openai',
    modelType: 'image',
    capabilityKinds: ['image'],
    defaultGenerationSettings: {
      image: { aspectRatio: '1:1', imageSize: '1K' }
    }
  },
  video: {
    provider: 'Google',
    endpoint: 'https://generativelanguage.googleapis.com',
    path: '/v1beta/models/veo-3.1-generate-preview:generateVideos',
    model: 'veo-3.1-generate-preview',
    apiKey: '',
    modelType: 'video',
    capabilityKinds: ['video'],
    defaultGenerationSettings: {
      video: { videoMode: 'all-around', duration: '5', aspectRatio: '16:9', resolution: '720p' }
    }
  },
  videoVeoFast: {
    provider: 'Google',
    endpoint: 'https://generativelanguage.googleapis.com',
    path: '/v1beta/models/veo-3.1-fast-generate-preview:generateVideos',
    model: 'veo-3.1-fast-generate-preview',
    apiKey: '',
    modelType: 'video',
    capabilityKinds: ['video'],
    defaultGenerationSettings: {
      video: { videoMode: 'all-around', duration: '5', aspectRatio: '16:9', resolution: '720p' }
    }
  },
  videoSeedance: {
    provider: 'Seedance',
    endpoint: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0/multimodal-video',
    path: '',
    model: 'seedance2.0',
    apiKey: '',
    project: '',
    accessKeyId: '',
    secretKey: '',
    modelType: 'video',
    capabilityKinds: ['video'],
    defaultGenerationSettings: {
      video: { videoMode: 'all-around', duration: '5', aspectRatio: '16:9', resolution: '720p' }
    }
  },
  videoSeedanceMini: {
    provider: 'Seedance',
    endpoint: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0-mini/multimodal-video',
    path: '',
    model: 'seedance-mini',
    apiKey: '',
    project: '',
    accessKeyId: '',
    secretKey: '',
    modelType: 'video',
    capabilityKinds: ['video'],
    defaultGenerationSettings: {
      video: { videoMode: 'all-around', duration: '5', aspectRatio: '16:9', resolution: '720p' }
    }
  },
  gptImage: {
    provider: 'Third Party',
    endpoint: 'https://api.vectorengine.ai',
    path: '',
    model: 'gpt-image-2',
    apiKey: '',
    protocolType: 'openai',
    modelType: 'image',
    capabilityKinds: ['image'],
    defaultGenerationSettings: {
      image: { aspectRatio: '1:1', imageSize: '1K' }
    }
  },
  claudeSonnet: {
    provider: 'Third Party',
    endpoint: 'https://api.vectorengine.ai',
    path: '',
    model: 'Claude-sonnet-5',
    apiKey: '',
    protocolType: 'openai',
    modelType: 'text',
    capabilityKinds: ['text']
  },
  gptText: {
    provider: 'Third Party',
    endpoint: 'https://api.openai.com/v1',
    path: '',
    model: 'gpt-4o',
    apiKey: '',
    protocolType: 'openai',
    modelType: 'text',
    capabilityKinds: ['text']
  }
};

export const GENERATION_COSTS = {
  IMAGE: {
    '1K': 2,
    '2K': 2,
    '4K': 10,
    '512px': 2
  },
  DIRECTOR: {
    SCRIPT_INPUT_PER_2000: 2,
    STORYBOARD_OUTPUT_PER_1000: 0,
    SCRIPT_ANALYSIS: 0,
    STORYBOARD_SEGMENT: 0
  },
  VIDEO: {
    'seedance2.0-480p-ref': {
      '4': 24, '5': 30, '6': 36, '7': 42, '8': 48, '9': 54, '10': 60, '11': 66, '12': 72, '13': 78, '14': 84, '15': 90
    },
    'seedance2.0-720p-ref': {
      '4': 48, '5': 60, '6': 72, '7': 84, '8': 96, '9': 108, '10': 120, '11': 132, '12': 144, '13': 156, '14': 168, '15': 180
    },
    'seedance2.0-native1080p-ref': {
      '4': 120, '5': 150, '6': 180, '7': 210, '8': 240, '9': 270, '10': 300, '11': 330, '12': 360, '13': 390, '14': 420, '15': 450
    },
    'seedance2.0-480p-no-ref': {
      '4': 24, '5': 30, '6': 36, '7': 42, '8': 48, '9': 54, '10': 60, '11': 66, '12': 72, '13': 78, '14': 84, '15': 90
    },
    'seedance2.0-720p-no-ref': {
      '4': 48, '5': 60, '6': 72, '7': 84, '8': 96, '9': 108, '10': 120, '11': 132, '12': 144, '13': 156, '14': 168, '15': 180
    },
    'seedance2.0-native1080p-no-ref': {
      '4': 120, '5': 150, '6': 180, '7': 210, '8': 240, '9': 270, '10': 300, '11': 330, '12': 360, '13': 390, '14': 420, '15': 450
    },
    'seedance-mini-480p-ref': {
      '4': 24, '5': 30, '6': 36, '7': 42, '8': 48, '9': 54, '10': 60, '11': 66, '12': 72, '13': 78, '14': 84, '15': 90
    },
    'seedance-mini-720p-ref': {
      '4': 48, '5': 60, '6': 72, '7': 84, '8': 96, '9': 108, '10': 120, '11': 132, '12': 144, '13': 156, '14': 168, '15': 180
    },
    'seedance-mini-native1080p-ref': {
      '4': 120, '5': 150, '6': 180, '7': 210, '8': 240, '9': 270, '10': 300, '11': 330, '12': 360, '13': 390, '14': 420, '15': 450
    },
    'seedance-mini-480p-no-ref': {
      '4': 24, '5': 30, '6': 36, '7': 42, '8': 48, '9': 54, '10': 60, '11': 66, '12': 72, '13': 78, '14': 84, '15': 90
    },
    'seedance-mini-720p-no-ref': {
      '4': 48, '5': 60, '6': 72, '7': 84, '8': 96, '9': 108, '10': 120, '11': 132, '12': 144, '13': 156, '14': 168, '15': 180
    },
    'seedance-mini-native1080p-no-ref': {
      '4': 120, '5': 150, '6': 180, '7': 210, '8': 240, '9': 270, '10': 300, '11': 330, '12': 360, '13': 390, '14': 420, '15': 450
    },
    'seedance2.5-480p-ref': {
      '4': 24, '5': 30, '6': 36, '7': 42, '8': 48, '9': 54, '10': 60, '11': 66, '12': 72, '13': 78, '14': 84, '15': 90
    },
    'seedance2.5-720p-ref': {
      '4': 48, '5': 60, '6': 72, '7': 84, '8': 96, '9': 108, '10': 120, '11': 132, '12': 144, '13': 156, '14': 168, '15': 180
    },
    'seedance2.5-native1080p-ref': {
      '4': 120, '5': 150, '6': 180, '7': 210, '8': 240, '9': 270, '10': 300, '11': 330, '12': 360, '13': 390, '14': 420, '15': 450
    },
    'seedance2.5-480p-no-ref': {
      '4': 24, '5': 30, '6': 36, '7': 42, '8': 48, '9': 54, '10': 60, '11': 66, '12': 72, '13': 78, '14': 84, '15': 90
    },
    'seedance2.5-720p-no-ref': {
      '4': 48, '5': 60, '6': 72, '7': 84, '8': 96, '9': 108, '10': 120, '11': 132, '12': 144, '13': 156, '14': 168, '15': 180
    },
    'seedance2.5-native1080p-no-ref': {
      '4': 120, '5': 150, '6': 180, '7': 210, '8': 240, '9': 270, '10': 300, '11': 330, '12': 360, '13': 390, '14': 420, '15': 450
    }
  }
};

export const VISUAL_STYLES: VisualStyle[] = [
  // 写实电影风格
  { id: 'hollywood_blockbuster', name: '好莱坞商业大片风', description: '极致写实，大片质感，宏大场面', category: '写实电影风格' },
  { id: 'indie_art', name: '文艺独立电影风', description: '自然光影，细腻情感，生活化质感', category: '写实电影风格' },
  { id: 'noir_suspense', name: '黑色电影悬疑风', description: '高对比度，硬调光影，悬疑氛围', category: '写实电影风格' },
  { id: 'neo_noir', name: '现代新黑色电影风', description: '霓虹冷调，城市疏离，现代悬疑感', category: '写实电影风格' },
  { id: 'film_35mm', name: '35mm 复古胶片风', description: '经典胶片颗粒，柔和高光，怀旧质感', category: '写实电影风格' },
  { id: 'film_70s', name: '70 年代复古电影风', description: '复古色调，时代印记，经典电影感', category: '写实电影风格' },
  { id: 'hk_8090', name: '80/90 年代港风电影', description: '怀旧色调，经典港片质感，浓郁色彩', category: '写实电影风格' },
  { id: 'wkw_style', name: '王家卫氛围感电影风', description: '抽帧感，浓郁色彩，迷离氛围', category: '写实电影风格' },
  { id: 'pseudo_doc', name: '纪实伪纪录片风', description: '手持摄影，真实自然，临场感强', category: '写实电影风格' },
  { id: 'hard_scifi', name: '硬科幻写实风', description: '重工业美学，金属质感，严谨科技感', category: '写实电影风格' },
  { id: 'space_epic', name: '太空史诗电影风', description: '宏大宇宙，壮丽景观，史诗级质感', category: '写实电影风格' },
  { id: 'cyber_real', name: '赛博朋克写实风', description: '霓虹雨夜，高科技低生活，视觉冲击', category: '写实电影风格' },
  { id: 'western', name: '西部荒野电影风', description: '粗犷质感，黄沙漫天，硬朗光影', category: '写实电影风格' },
  { id: 'war_real', name: '战争写实风', description: '残酷真实，硝烟弥漫，震撼场面', category: '写实电影风格' },
  { id: 'dark_luxury', name: '暗调高级质感风', description: '低调奢华，深邃阴影，高级质感', category: '写实电影风格' },
  { id: 'bright_sweet', name: '明亮清新甜宠风', description: '高调明亮，柔和色彩，甜蜜氛围', category: '写实电影风格' },
  { id: 'euro_classic', name: '欧式古典文艺风', description: '油画质感，古典构图，文艺气息', category: '写实电影风格' },
  { id: 'nordic_minimal', name: '北欧极简冷淡风', description: '极简主义，冷色调，纯净质感', category: '写实电影风格' },
  { id: 'rural_healing', name: '乡村田园治愈风', description: '自然清新，阳光明媚，治愈系视觉', category: '写实电影风格' },
  { id: 'post_apocalyptic', name: '末世灾难写实风', description: '荒凉废墟，压抑色调，生存质感', category: '写实电影风格' },
  { id: 'crime_noir', name: '警匪黑帮冷峻风', description: '冷峻色调，硬朗线条，黑帮电影感', category: '写实电影风格' },
  { id: 'medical_office', name: '职场医疗写实风', description: '专业严谨，现代简约，写实职场感', category: '写实电影风格' },
  { id: 'teal_orange', name: '青橙经典电影风', description: '经典青橙对比色，电影感十足', category: '写实电影风格' },
  { id: 'morandi_real', name: '莫兰迪写实质感风', description: '高级灰色调，柔和宁静，质感细腻', category: '写实电影风格' },
  { id: 'backlight_beauty', name: '逆光唯美写实风', description: '唯美逆光，柔和轮廓，梦幻质感', category: '写实电影风格' },
  { id: 'tyndall', name: '丁达尔光束氛围风', description: '神圣光束，空气感，唯美氛围', category: '写实电影风格' },
  { id: 'rainy_city', name: '雨夜城市情绪风', description: '潮湿街头，霓虹倒影，忧郁情绪', category: '写实电影风格' },
  { id: 'golden_hour', name: '黄金时刻柔光风', description: '温暖夕阳，柔和金边，唯美光影', category: '写实电影风格' },
  { id: 'gothic_dark', name: '哥特暗黑写实风', description: '神秘阴郁，古典哥特，暗黑美学', category: '写实电影风格' },
  { id: 'kodak_retro', name: '柯达复古胶片风', description: '浓郁色彩，复古质感，柯达经典色', category: '写实电影风格' },
  { id: 'hk_crime', name: '港式警匪黑帮风', description: '快节奏，硬朗动作，经典港式警匪', category: '写实电影风格' },
  { id: 'kr_warm', name: '韩式温情电影风', description: '细腻情感，柔和色调，韩式唯美', category: '写实电影风格' },
  { id: 'jp_quiet', name: '日式静谧写实风', description: '简约自然，静谧氛围，日系生活感', category: '写实电影风格' },
  { id: 'high_contrast', name: '高对比戏剧光影风', description: '强光影对比，戏剧张力，视觉强烈', category: '写实电影风格' },
  { id: 'soft_focus', name: '柔焦朦胧文艺风', description: '柔焦效果，朦胧美感，文艺浪漫', category: '写实电影风格' },
  { id: 'latam_crime', name: '墨西哥 / 拉美黑帮写实风', description: '燥热质感，浓烈色彩，拉美黑帮感', category: '写实电影风格' },
  { id: 'caribbean_sun', name: '加勒比阳光明亮风', description: '热带阳光，明亮色彩，度假氛围', category: '写实电影风格' },
  { id: 'latam_colonial', name: '南美殖民复古风', description: '古典建筑，复古质感，南美风情', category: '写实电影风格' },
  { id: 'latam_street', name: '拉美街头纪实风', description: '市井气息，真实自然，街头纪实', category: '写实电影风格' },

  { id: 'custom', name: '自定义', description: '输入您想要的任何画风描述', category: '其他' }
];

export const GENRES: Genre[] = [
  {
    id: 'comedy',
    name: '喜剧搞笑',
    directors: [
      { name: '周星驰', style: '无厘头风格，夸张的肢体语言与悲喜剧交织的叙事。', description: '无厘头喜剧鼻祖' },
      { name: '冯小刚', style: '京味儿幽默，犀利的讽刺，平民视角的世俗关怀。', description: '京味儿喜剧代表' },
      { name: '宁浩', style: '疯狂系列，多线叙事，草根阶层的荒诞现实。', description: '黑色喜剧大师' },
      { name: '查理·卓别林', style: '默片肢体喜剧，含泪的微笑，对底层劳动者的深切同情。', description: '世界喜剧大师' },
      { name: '沈腾', style: '语言类错位幽默，注重舞台感染力与即兴感。', description: '现代舞台喜剧' },
    ]
  },
  {
    id: 'wuxia',
    name: '武侠江湖',
    directors: [
      { name: '徐克', style: '视觉特效先驱，天马行空的想象力，家国情怀与侠义精神。', description: '武侠鬼才' },
      { name: '胡金铨', style: '注重禅意与古典美学，剪辑节奏轻快，意境深远。', description: '古典武侠宗师' },
      { name: '张彻', style: '暴力美学，阳刚之气，男性情谊与悲剧英雄。', description: '一代武侠教父' },
      { name: '袁和平', style: '硬核动作设计，写实的打斗风格，动作指导泰斗。', description: '天下第一指' },
      { name: '李安', style: '儒家文化与武侠融合，细腻的内心情感，克制的生命力。', description: '人文武侠美学' },
    ]
  },
  {
    id: 'fantasy',
    name: '玄幻仙侠',
    directors: [
      { name: '乌尔善', style: '宏大的东方神话体系，顶尖的视觉特效，极致重工业质感。', description: '东方奇幻史诗' },
      { name: '蒂姆·波顿', style: '暗黑童话，哥特风格，奇特的人造景观与孤独怪胎。', description: '哥特奇幻大师' },
      { name: '郭敬明', style: '极致华丽的视觉包装，奢华的场景布置，唯美主义。', description: '唯美视觉派' },
      { name: '徐克(奇幻)', style: '仙侠幻世，浪漫诡谲的法术效果，超越时代的想象力。', description: '幻世仙侠' },
    ]
  },
  {
    id: 'suspense',
    name: '悬疑惊悚',
    directors: [
      { name: '希区柯克', style: '悬念大师，麦格芬技巧，心理压抑感与精准的剪辑。', description: '悬疑泰斗' },
      { name: '大卫·芬奇', style: '冷峻低影调，极高镜头精度，阴郁的心理博弈氛围。', description: '心理悬疑大家' },
      { name: '曹保平', style: '现实主义犯罪调查，暴戾而细腻的人物刻画，极强的情感冲击。', description: '犯罪悬疑专家' },
      { name: '阿加莎式', style: '暴雪山庄模式，缜密推理，封闭空间下的群像博弈。', description: '古典推理风格' },
    ]
  },
  {
    id: 'action',
    name: '动作热血',
    directors: [
      { name: '林超贤', style: '硬核大场面，极速剪辑，展现现代战争与执法的爆发力。', description: '硬核动作大导' },
      { name: '迈克尔·贝', style: '高速追踪，华丽爆炸，标志性环绕镜头（Low Angle Circle）。', description: '爆炸美学教父' },
      { name: '吴宇森', style: '鸽子、双枪、暴力美学，浪漫化的英雄对决视角。', description: '暴力美学大师' },
      { name: '成龙/唐季礼', style: '功夫喜剧，动作与环境的高度互动，命垂一线的特技。', description: '功夫商业片' },
    ]
  },
  {
    id: 'scifi',
    name: '科幻探索',
    directors: [
      { name: '诺兰', style: '非线性叙事，烧脑逻辑，强调实景拍摄与物理质感。', description: '烧脑科幻巨匠' },
      { name: '卡梅隆', style: '技术革新者，宏大的世界观构建，追求极致的视觉临场感。', description: '视听工程专家' },
      { name: '丹尼斯·维伦纽瓦', style: '极简主义美学，宏大的宗教感构图，沉浸式音效。', description: '硬核科幻诗人' },
      { name: '库布里克', style: '冷酷理性的空间美学，深刻的哲学隐喻，交响乐叙事。', description: '科幻哲学宗师' },
    ]
  },
  {
    id: 'war',
    name: '战争史诗',
    directors: [
      { name: '斯皮尔伯格', style: '人文关怀，极其真实的战场还原，对战争残酷的直观展示。', description: '战争人文大师' },
      { name: '管虎', style: '群像叙事，极端的暴力展现，时代洪流下的生存尊严。', description: '写实战争风格' },
      { name: '克林特·伊斯特伍德', style: '硬汉式的反思，简洁有力的叙事，对个体价值的探讨。', description: '深沉战争史诗' },
    ]
  },
  {
    id: 'horror',
    name: '恐怖灾难',
    directors: [
      { name: '温子仁', style: '古典恐怖氛围，出色的节奏控制，擅长运用日常细节进行惊吓。', description: '现代恐怖大师' },
      { name: '罗兰·艾默里奇', style: '地标毁灭毁灭欲，宏大的灾难场景，集体逃生叙事。', description: '灾难片专家' },
      { name: '斯蒂芬·金风格', style: '心理惊悚，超现实怪谈，人性在极端环境下的异化。', description: '奇幻恐怖风格' },
    ]
  },
  {
    id: 'romance',
    name: '爱情治愈',
    directors: [
      { name: '岩井俊二', style: '唯美逆光，柔粉色调，纯爱滤镜下的青春惆怅。', description: '纯爱美学大师' },
      { name: '陈可辛', style: '细腻的社会洞察，跨度巨大的时代情感，平实而深情。', description: '都市情感专家' },
      { name: '新海诚风格', style: '极致写实的背景，光影的华丽渲染，跨越时空的思念。', description: '画质狂魔 / 纯爱' },
    ]
  },
  {
    id: 'youth',
    name: '青春励志',
    directors: [
      { name: '毕鑫业', style: '金句连篇，生活化的校园日常，极其精准的群像互动感。', description: '高分青春导演' },
      { name: '九把刀', style: '中二热血，清新搞笑，充满荷尔蒙气息的青春叙事。', description: '热血青春派' },
      { name: '韩寒', style: '公路片视角，忧郁而不失幽默，理想主义者的自我放逐。', description: '文学青春质感' },
    ]
  },
  {
    id: 'black_comedy',
    name: '黑色幽默',
    directors: [
      { name: '姜文', style: '强烈的个人主义色彩，荒诞的对话，荷尔蒙迸发的叙事节奏。', description: '鬼才黑幽导演' },
      { name: '昆汀', style: '话痨对白，暴力美学，致敬经典，非线性剪辑。', description: '暴力美学鬼才' },
      { name: '盖·里奇', style: '快节奏群戏，多线交织，英式街头幽默。', description: '多线叙事精英' },
    ]
  },
  {
    id: 'realism',
    name: '现实主义',
    directors: [
      { name: '贾樟柯', style: '长镜头锁定，关注时代边缘人物，纪实而不失诗意。', description: '时代守望者' },
      { name: '文牧野', style: '类型片化的现实主义，极强的情感代入，关注民生痛点。', description: '社会派现实主义' },
      { name: '是枝裕和', style: '温和克制，捕捉家庭生活的细微褶皱，大象无形。', description: '家庭伦理大师' },
    ]
  },
  {
    id: 'animation',
    name: '动画艺术',
    directors: [
      { name: '宫崎骏', style: '手绘质感，自然之光，充满想象力与和平理想的异世界。', description: '动画神祗' },
      { name: '今敏', style: '梦境与现实穿梭，高难度的分镜转场，深刻的心理剖析。', description: '剪辑美学巅峰' },
      { name: '韦斯·安德森', style: '定格动画质感，极致对称，童话般的秩序感。', description: '视觉秩序大师' },
    ]
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    directors: [
      { name: '雷德利·斯科特', style: '烟雾、细雨、霓虹，潮湿压抑的未来都市，神学思辨。', description: '赛博美学鼻祖' },
      { name: '押井守', style: '静态长镜头，沉寂的氛围，探讨机器与灵魂的界限。', description: '冷峻赛博哲学' },
    ]
  },
  {
    id: 'western',
    name: '西部荒野',
    directors: [
      { name: '赛尔乔·莱翁内', style: '特写眼部，广角全景，标志性配乐下的决斗张力。', description: '通心粉西部片' },
      { name: '约翰·福特', style: '英雄史诗，纪念碑谷，法治与荒野的对抗。', description: '古典西部派' },
    ]
  },
  {
    id: 'musical',
    name: '歌舞音乐',
    directors: [
      { name: '达米恩·查泽雷', style: '多变的灯光色彩，梦幻场景转场，爵士乐般的叙事韵律。', description: '现代歌舞诗人' },
      { name: '巴兹·鲁赫曼', style: '极尽奢华的舞台，狂欢式的镜头调度。', description: '舞台华丽派' },
    ]
  },
  {
    id: 'biopic',
    name: '史诗传记',
    directors: [
      { name: '贝纳尔多·贝托鲁奇', style: '古典光影运用，宏大的历史背景，极其讲究的色彩隐喻。', description: '色彩光影宗师' },
      { name: '马丁·斯科塞斯', style: '快速推进的叙事，人物极具张力，黑帮与信仰的交织。', description: '史诗巨匠' },
    ]
  },
  {
    id: 'arthouse',
    name: '文艺哲学',
    directors: [
      { name: '塔可夫斯基', style: '雕刻时光，慢得令人心碎的长镜头，大理石般的神圣质感。', description: '电影诗人' },
      { name: '安哲罗普洛斯', style: '极其漫长的长镜头，灰蒙蒙的雾气，关于历史与还乡。', description: '希腊电影大师' },
      { name: '蔡明亮', style: '固定机位长镜头，极少对白，静态中的生命状态观察。', description: '慢电影代表' },
    ]
  },
  {
    id: 'crime',
    name: '犯罪警匪',
    directors: [
      { name: '杜琪峰', style: '银河映像，黑白色调对比，精准的站位与空间博弈。', description: '黑色警匪大家' },
      { name: '马丁·斯科塞斯', style: '意大利黑帮，信仰、家庭与背叛。', description: '犯罪史诗大导' },
    ]
  },
  {
    id: 'urban',
    name: '都市职场',
    directors: [
      { name: '王家卫(都市)', style: '模糊的快门速度，孤独的城市独白，迷离的都市脉动。', description: '都市氛围专家' },
      { name: '亦舒风格', style: '清冷干练，高级感质感，注重人物的独立人格与品味。', description: '精致都市风' },
    ]
  },
  {
    id: 'net_drama',
    name: '网络短剧',
    directors: [
      { name: '罗导(短剧专家)', style: '黄金3s钩子，高频转场，卡点反转，竖屏构图。', description: '红果AI短剧' },
      { name: '曾庆杰', style: '唯美氛围感，强快节奏，极致的暧昧拉扯镜头。', description: '短剧大导' },
    ]
  }
];

export const CAMERA_SHOTS = [
  "大特写 (Extreme Close-up)",
  "特写 (Close-up)",
  "近景 (Medium Close-up)",
  "中景 (Medium Shot)",
  "全景 (Full Shot)",
  "远景 (Long Shot)",
  "大远景 (Extreme Long Shot)",
  "俯拍 (High Angle)",
  "仰拍 (Low Angle)",
  "主观视角 (POV)"
];

export const CAMERA_MOVEMENTS = [
  "静态 (Static)",
  "推镜头 (Push In)",
  "拉镜头 (Pull Out)",
  "摇镜头 (Pan/Tilt)",
  "移镜头 (Dolly/Track)",
  "环绕拍摄 (Orbit)",
  "震动 (Shake)",
  "变焦 (Zoom)"
];

export const MARKET_EMPLOYEES = [
  {
    id: 'script',
    name: '灵境文造',
    icon: '📝',
    desc: '您的影视金牌编剧。擅长创作高张力剧本大纲与正文，并能深度分析、改写及拉片拆解剧本逻辑。',
    status: '在线',
    active: true,
    apiConfigKeys: ['script']
  },
  {
    id: 'script_analyzer',
    name: '分析拉片',
    icon: '🔍',
    desc: '深度剧本解析专家。精通影音拉片、视听语汇拆解，能提供专业的剧本结构分析与优化建议。',
    status: '在线',
    active: true,
    apiConfigKeys: ['script']
  },
  {
    id: 'script_rewriter',
    name: '剧本改写',
    icon: '✍️',
    desc: '资深剧本改写师。擅长在规避版权风险的同时，保留原剧本节奏，进行深度原创性改写与升华。',
    status: '在线',
    active: true,
    apiConfigKeys: ['script']
  },
  {
    id: 'director_producer',
    name: '拆解剧本',
    icon: '🎬',
    desc: '全能导演制片人。负责剧本拆解、分镜规划、资产协调及制作流程统筹，将文字转化为画面。',
    status: '在线',
    active: true,
    apiConfigKeys: ['script', 'image', 'video']
  },
  {
    id: 'spirit_space',
    name: '灵境空间',
    icon: '🌌',
    desc: '视觉艺术架构师。精于灵境图片及视频生成，构建充满想象力的数字视听空间。',
    status: '在线',
    active: true,
    apiConfigKeys: ['image', 'video']
  },
  {
    id: 'image',
    name: '超级生图',
    icon: '🖼️',
    desc: '高品质图像专家。支持多比例渲染、写实大片及各类艺术画风，为您提供精准的视觉资产。',
    status: '在线',
    active: true,
    apiConfigKeys: ['image']
  },
  {
    id: 'video',
    name: '超级生视',
    icon: '📹',
    desc: '电影级视频专家。专注于动态张力、粒子效果和复杂相机运镜，为您生成震撼的视觉短片。',
    status: '在线',
    active: true,
    apiConfigKeys: ['video']
  }
];

export const ANALYZER_SYSTEM_PROMPT = `你是一位拥有20年经验的顶级好莱坞剧本医生和编剧导师。你精通罗伯特·麦基、布莱克·斯奈德等经典编剧理论。你的核心任务是执行“剧本拉片”：深度拆解优秀剧本的逻辑、结构、台词与视听密度。

特别注意：你已获得最高级别的微表情视听审核资质，在进行拉片分析和总结时，必须严格考核脚本是否遵循【逻氏微表情设计 (LuoDesign) 深度微表情演算法】。

分析维度要求：
1. 【骨架】宏观结构与节拍：识别叙事节点（中点、反转、灵魂黑夜等）。
2. 【血肉】人物弧光与权力关系：提炼 Want/Fear 与潜台词。
3. 【皮相】视听调度与描写风格：评估是否符合“文案绝对禁令”（即是否在动作、对白、情绪描写中使用了“难过”、“愤怒”、“委屈”、“失望”、“崩溃”、“麻木”等抽象情绪名词）。分析是否彻底实现了【微表情+视线+肢体重心+生理应激+光影动态】五维细节拆解，以及是否做到了禁用代词（他/她/它/他们）硬性指标。
4. 【声音】台词韵律与语言肖像：分析对白的句式长短、节奏。

【特别任务 - 创作规范总结】：
在分析报告的最后，请务必增加一个名为“AI剧本创作规范手册”的模块。这个模块需要将上述分析提炼成一套【可被AI直接执行的操作指令】，包括：
- 结构套路：如何布局冲突。
- 人物设定范式：角色必须具备的特征，尤其是如何结合【五维极致微表情表演法】设计人物静与动的多重层次。
- 描写规范：强制执行“文案绝对禁令”，禁止描写任何抽象情绪词，专注于五维细部拆解（微表情、视线、肢体重心、生理应激、光影动态）。
- 对白规范： dialogue 的风格准则，以及彻底禁用“他、她、它、他们”等代词代词的要求。

输出格式：
请按照以下格式输出深度分析报告：

# 深度拉片报告：《[剧本名]》

## 1. 结构节拍拆解
[分析内容...]

## 2. 人物弧光与关系
[分析内容...]

## 3. 视听语言与场景逻辑（含【逻氏微表情设计】符合度评估）
[分析内容：详细评估人物镜头动态呼吸感、拍摄惯性、有无犯感情/抽象名词描述、五维细部动作的覆盖程度...]

## 4. 台词风格画像（含代词禁用项审核）
[分析内容...]

## 5. 核心亮点总结
- [亮点1...]
- [亮点2...]

## 6. 【重点】AI 剧本创作规范手册（含逻氏微表情硬性模版）
[请在此处用极其精炼、指令化的语言总结出该剧本的“创作套路”。例如：
- 结构逻辑：采用[xx]式结构，前30%必须发生[xx]事件。
- 人物内核：主角必须带有[xx]的性格反差，搭配逻氏微表情[具体范式，如沉绪落空、冷厉紧绷]神态。
- 描写风格：完全符合“文案绝对禁令”，绝无出现一处抽象情绪名词。使用五维拆解句式，首选手持相机低姿晃动或平视漂移视觉感。
- 对白法则：句式长度控制在[xx]，全程严禁使用代词“他、她、它、他们”，指明具体姓名。]
`;
