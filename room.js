class Room {
    constructor(host) {
        this.host = host;
        this.members = [host];
    }
    add(memberId) {
        this.members.push(memberId);
    }
    remove(memberId) {
        this.members = this.members.filter(id => id !== memberId);
    }
}

module.exports = {Room};