// Import dependencies
const Discord = require('discord.js');
const {
	prefix,
	token,
} = require('./config.json');
const ytdl = require('ytdl-core');

// Create client & token
const client = new Discord.Client();
client.login(token);

// Listeners
client.once('ready', () => {
 console.log('Starting music bot...');
});
client.once('reconnecting', () => {
 console.log('Reconnecting...');
});
client.once('disconnect', () => {
 console.log('Disconnected music bot!');
});

// Read messages
client.on('message', async message => {
  // Ignore if message is from bot
  if (message.author.bot) return;

  // Ignore if message doesn't start with prefix
  if (!message.content.startsWith(prefix)) return;

  // Command implementations
  const serverQueue = queue.get(message.guild.id);
  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}seek`)) {
		seek(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}volume`)) {
		volume(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}join`)) {
		join(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}leave`)) {
		leave(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}ligma`)) {
		ligma(message, serverQueue);
		return;
	} else {
		return message.channel.send(getErrorMessage('Idiot', 'Not a valid command lol'));
  }
})

const voiceChannelError = 'You\'re not in a voice channel lol';
const noVideoError = 'Can\'t find that video lol';
const emptyPlaylistError = 'Playlist is empty lol';
const noPermissionsError = 'No permissions lol';

// Produce embedded message for song
function getSongMessage(song, title) {
	let video_id = song.url.split('/').pop().split('?').pop().slice(2);
	if(video_id.split('&list') > 1) video_id = video_id.split('&list')[0]
	const thumbnail_url = 'https://img.youtube.com/vi/'+ video_id + '/default.jpg';

	const songPlayingMessage = new Discord.MessageEmbed()
		.setColor('#eb34d8')
		.setTitle(title)
		.setDescription(`[${song.title}](${song.url})`)
		.setThumbnail(thumbnail_url);
	return songPlayingMessage;
}

// Produce embedded error message
function getErrorMessage(title, description) {
	const attachment = new Discord.MessageAttachment('./Resources/nono-pepe.jpg', 'nono-pepe.jpg');
	const errorMessage = new Discord.MessageEmbed()
		.setColor('#eb34d8')
		.setTitle(title)
		.attachFiles(attachment)
		.setImage('attachment://nono-pepe.jpg')
		.setDescription(description);
	return errorMessage;
}

// Queue for songs
const queue = new Map();

// Play song command
async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  // Exit if channel is empty
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
		return message.channel.send(getErrorMessage('Idiot', voiceChannelError));
  }

  // Exit if bot lacks permissions
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
		return message.channel.send(getErrorMessage('Idiot', noPermissionsError));
  }

  // Get song info
	try {
	  const songInfo = await ytdl.getInfo(args[1]);
	  const song = {
	      title: songInfo.videoDetails.title,
	      url: songInfo.videoDetails.video_url,
	  };

		// If queue already exists, push song to it. Otherwise, create queue.
	  if (!serverQueue) {
	    // Creating the contract for our queue
	    const queueConstruct = {
	      textChannel: message.channel,
	      voiceChannel: voiceChannel,
	      connection: null,
	      songs: [],
	      volume: 5,
	      playing: true,
	    };
	    // Setting the queue using our contract
	    queue.set(message.guild.id, queueConstruct);
	    // Pushing the song to our songs array
	    queueConstruct.songs.push(song);

	    try {
	      // Here we try to join the voicechat and save our connection into our object.
	      var connection = await voiceChannel.join();
	      queueConstruct.connection = connection;
	      // Calling the play function to start a song
	      play(message.guild, queueConstruct.songs[0]);
	    } catch (err) {
	      // Printing the error message if the bot fails to join the voicechat
	      console.log(err);
	      queue.delete(message.guild.id);
	      return message.channel.send(err);
	    }
	  } else {
	    serverQueue.songs.push(song);
	    return message.channel.send(getSongMessage(song, 'Added to queue!'));
	  }
	} catch (error) {
		console.log(`[ERROR] ${error}`);
    return message.channel.send(getErrorMessage('Idiot', noVideoError));
	}
}

// Play song command helper
function play(guild, song, startTime = 0) {
  const serverQueue = queue.get(guild.id);
  // If song is empty, leave voice channel and delete queue.
  if(!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  // Start playing song
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url), {seek: startTime})
    .on("finish", () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	if (startTime === 0) {
		return serverQueue.textChannel.send(getSongMessage(song, 'Now Playing'));
	}
}

// Skip song command
function skip(message, serverQueue) {
  if (!message.member.voice.channel) {
		return message.channel.send(getErrorMessage('Idiot', voiceChannelError));
	}
  if (!serverQueue) {
		return message.channel.send(getErrorMessage('Idiot', emptyPlaylistError));
	}
  serverQueue.connection.dispatcher.end();
}

// Stop song command
function stop(message, serverQueue) {
	if (!message.member.voice.channel) {
		return message.channel.send(getErrorMessage('Idiot', voiceChannelError));
  }
  if (!serverQueue) {
    return message.channel.send(getErrorMessage('Idiot', emptyPlaylistError));
  }
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

// Skip to certain point command
function seek(message, serverQueue) {
	const args = message.content.split(" ");

	// Exit if channel is empty
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.channel.send(getErrorMessage('Idiot', voiceChannelError));
  }

	// Check queue existing
	if(!serverQueue) {
		return message.channel.send(getErrorMessage('Idiot', emptyPlaylistError));
	}

	// Check command formatting
	if(args.length !== 2 || isNaN(args[1])) {
		return message.channel.send(getErrorMessage('Idiot', `Wrong command. Try "${prefix}seek <seconds>" lol`));
	}

	// If song is empty, leave voice channel and delete queue.
	if(!serverQueue.songs) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	// Time to skip to
	let seekTime = parseInt(args[1]);

	// Start playing song
  play(message.guild, serverQueue.songs[0], seekTime);

	// Print seek message
	let hours = Math.floor(seekTime / 3600);
	let minutes = Math.floor(seekTime / 60);
	minutes = (minutes === 0) ? '00' : minutes;
	let seconds = (seekTime % 60);
	seconds = (seconds === 0) ? '00' : seconds;

	let timeStamp = (hours === 0) ? `${minutes}:${seconds}` : `${hours}:${minutes}:${seconds}`;

	const seekMessage = new Discord.MessageEmbed()
	  .setColor('#eb34d8')
	  .setTitle(`Skipped to ${timeStamp}`);
  return serverQueue.textChannel.send(seekMessage);
}

// Change volume of bot command
function volume(message, serverQueue) {
	const args = message.content.split(" ");

	// Exit if channel is empty
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.channel.send(getErrorMessage('Idiot', voiceChannelError));
  }

	// Check queue existing
	if(!serverQueue) {
		return message.channel.send(getErrorMessage('Idiot', emptyPlaylistError));
	}

	const updatedVolume = parseInt(args[1]);
	serverQueue.connection['player']['dispatcher']['streams']['volume']['volume'] = updatedVolume;

	const changeMessage = new Discord.MessageEmbed()
		.setColor('#eb34d8')
		.setTitle('Updated Bot Volume')
		.setDescription(`Bot volume is now ${updatedVolume}.`);
	return serverQueue.textChannel.send(changeMessage);
}

// Join channel command
async function join(message, serverQueue) {
	// Exit if channel is empty
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
		return message.channel.send(getErrorMessage('Idiot', voiceChannelError));
  }

  // Exit if bot lacks permissions
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
		return message.channel.send(getErrorMessage('Idiot', noPermissionsError));
  }
	const connection = await voiceChannel.join();
}

// Leave channel command
async function leave(message, serverQueue) {
	// Exit if channel is empty
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
		return message.channel.send(getErrorMessage('Idiot', voiceChannelError));
  }
	const connection = await voiceChannel.leave();
}

// Ligma balls command
function ligma(message, serverQueue) {
	const ligmaMessage = new Discord.MessageEmbed()
		.setColor('#eb34d8')
		.setTitle(`It's so sad Steve Jobs died of ligma...`)
		.setDescription(`Who's Steve Jobs?\n||Ligma Balls||`);
	return message.channel.send(ligmaMessage);
}
