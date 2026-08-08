const sampleProfileOptions = require('../data/sample-profile-options')

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

async function findAgeGroups() {
  return clone(sampleProfileOptions.ageGroups)
}

function sampleTags(tags, { limit = 5, exclude = [] } = {}) {
  const excludedTags = new Set(exclude)
  const candidates = tags.filter(tag => !excludedTags.has(tag))
  const count = Math.min(Math.max(0, limit), candidates.length)

  for (let index = 0; index < count; index += 1) {
    const randomIndex = index + Math.floor(
      Math.random() * (candidates.length - index)
    )
    const current = candidates[index]
    candidates[index] = candidates[randomIndex]
    candidates[randomIndex] = current
  }
  return candidates.slice(0, count)
}

async function findSuggestedSkillTags(options) {
  return sampleTags(sampleProfileOptions.skillTags, options)
}

async function findSuggestedInterestTags(options) {
  return sampleTags(sampleProfileOptions.interestTags, options)
}

module.exports = {
  findAgeGroups,
  findSuggestedInterestTags,
  findSuggestedSkillTags,
}
