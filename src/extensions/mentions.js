const { getOnCallPerson } = require('rosters');
const { addExtension } = require('../helpers/teams');
const { addTextBlock } = require('../helpers/slack');
const { HOOK, STATUS } = require('../helpers/constants');

function run({ target, extension, payload, root_payload }) {
  if (target.name === 'teams') {
    extension.inputs = Object.assign({}, default_inputs_teams, extension.inputs);
    attachForTeam({ extension, payload });
  } else if (target.name === 'slack') {
    extension.inputs = Object.assign({}, default_inputs_slack, extension.inputs);
    attachForSlack({ extension, payload });
  } else if (target.name === 'chat') {
    extension.inputs = Object.assign({}, default_inputs_chat, extension.inputs);
    attachForChat({ extension, root_payload });
  }
}

function attachForTeam({ extension, payload }) {
  const users = getUsers(extension);
  if (users.length > 0) {
    setPayloadWithMSTeamsEntities(payload);
    const users_ats = users.map(user => `<at>${user.name}</at>`);
    addExtension({ payload, extension, text: users_ats.join(' ｜ ')});
    for (const user of users) {
      payload.msteams.entities.push({
        "type": "mention",
        "text": `<at>${user.name}</at>`,
        "mentioned": {
          "id": user.teams_upn,
          "name": user.name
        }
      });
    }
  }
}

function attachForSlack({ extension, payload }) {
  const users = getUsers(extension);
  const user_ids = users.map(user => `<@${user.slack_uid}>`);
  if (users.length > 0) {
    addTextBlock({ payload, extension, text: user_ids.join(' ｜ ') });
  }
}

function attachForChat({ extension, root_payload }) {
  const users = getUsers(extension);
  const user_ids = users.map(user => `<users/${user.chat_uid}>`);
  if (users.length > 0) {
    root_payload.text = user_ids.join(' ｜ ');
  }
}

function getUsers(extension) {
  const users = [];
  if (extension.inputs.users) {
    users.push(...extension.inputs.users);
  }
  if (extension.inputs.schedule) {
    const user = getOnCallPerson(extension.inputs.schedule);
    if (user) {
      users.push(user);
    } else {
      // TODO: warn message for no on-call person
    }
  }
  return users;
}

function setPayloadWithMSTeamsEntities(payload) {
  if (!payload.msteams) {
    payload.msteams = {};
  }
  if (!payload.msteams.entities) {
    payload.msteams.entities = [];
  }
}

const default_options = {
  hook: HOOK.END,
  condition: STATUS.FAIL
}

const default_inputs_teams = {
  title: '',
  separator: true
}

const default_inputs_slack = {
  title: '',
  separator: false
}

const default_inputs_chat = {
  title: '',
  separator: true
}

module.exports = {
  run,
  default_options
}