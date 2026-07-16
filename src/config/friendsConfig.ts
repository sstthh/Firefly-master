import type { FriendLink, FriendsPageConfig } from "../types/friendsConfig";

// 可以在src/content/spec/friends.md中编写友链页面下方的自定义内容

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 是否显示底部自定义内容（friends.mdx 中的内容）
	showCustomContent: true,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 是否开启随机排序配置，如果开启，就会忽略权重，构建时进行一次随机排序
	randomizeSort: false,
};

// 友链配置
export const friendsConfig: FriendLink[] = [
  {
    title: "一切奇迹的起点 - where all miracles begin",
    imgurl: "https://www.whereallmiraclesbegin.top/img/youniaoxia.png",
    desc: "一份从蔚蓝档案中掉出来的博客",
    siteurl: "https://www.whereallmiraclesbegin.top/",
    tags: ["Blog"],
    weight: 10, // 权重，数字越大排序越靠前
    enabled: true, // 是否启用
  },
  {
    title: "Mimosa的小站 - 仅此而已。",
    imgurl: "https://loneapex.cn/wp-content/themes/argon/extra-js/favicon.jpg",
    desc: "含羞草居住的地方",
    siteurl: "https://loneapex.cn",
    tags: ["Blog"],
    weight: 10,
    enabled: true,
  },
  {
    title: "ElysiumStack - 不会摄影的设计师不是优秀的旅行家",
    imgurl: "https://blog.elysium-stack.cn/favicon/favicon.ico",
    desc: "ElysiumStack - 探索技术与生活的交汇点，分享全栈技术、ACGN 文化与生活感悟的个人博客。",
    siteurl: "https://blog.elysium-stack.cn/",
    tags: ["Blog"],
    weight: 10,
    enabled: true,
  },
  {
    title: "RhoPaperの小站 - 纸 至 执",
    imgurl: "https://blog.rhopaper.top/avatar.jpg",
    desc: "RhoPaper，在浩瀚互联网角落阴暗扭曲爬行的编程爱好者&amp;小小UP，致力于创作石山代码与高质量灌水视频。",
    siteurl: "https://blog.rhopaper.top/",
    tags: ["Blog"],
    weight: 10,
    enabled: true,
  },
  {
    title: "咖啡豆子coffee的小站",
    imgurl: "https://images.kfdzcoffee.cn/i/1/avatar.png",
    desc: "所有奇迹的始发点",
    siteurl: "https://blog.kfdzcoffee.cn",
    tags: ["Blog"],
    weight: 10,
    enabled: true,
  },
  {
    title: "Duo 云站",
    imgurl: "https://www.mduo.cloud/favicon.svg",
    desc: "MathForest官方🌲|程序及数学可视化✨|屑魔女游世界🔮",
    siteurl: "https://www.mduo.cloud/",
    tags: ["Blog"],
    weight: 10,
    enabled: true,
  },
  {
    title: "基沃托斯古书馆 ~蔚蓝档案与百科的奇迹~",
    imgurl: "https://kivo.wiki/favicon.png",
    desc: "有趣的《蔚蓝档案》资料站，差分立绘鉴赏、可动角色CG、角色速查、资讯概况等的一站式wiki服务。",
    siteurl: "https://kivo.wiki/",
    tags: ["Tools"],
    weight: 8,
    enabled: true,
  },
];

// 获取启用的友链并进行排序
export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);

	if (friendsPageConfig.randomizeSort) {
		return friends.sort(() => Math.random() - 0.5);
	}

	return friends.sort((a, b) => b.weight - a.weight);
};
