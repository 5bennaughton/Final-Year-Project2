Authentication & Accounts

- Users must be able to sign up and log in securely. (complete)
- Users must be able to view their profile name. (complete)
- Users must be able to log out. (complete)
- Users must be able to reset their password via email.
- Users must be able to change their password while logged in.
- Users must be able to update profile details (name, bio, avatar).
- Users must be able to stay logged in across app restarts (persistent session).
- Users must be able to view basic account settings (email, username etc).
- The app must handle expired tokens by forcing re-login gracefully.
- Need email verification

Future Sessions (Posts)

- Users must be able to create a future session post with sport, time, and location.
- Future session posts must support optional coordinates. (complete)
- Users must be able to view their own future session posts. (complete)
- Users must be able to delete their own future session posts. (complete)
- Users must be able to comment on a future session post. (complete)
- Users must be able to delete their own comments. (complete)
- Users must be able to view nearby future sessions by distance. (complete)
- Users must be able to edit a future post (time, location, notes).
- The app must prevent creating posts in the past.
- While creating a future post, the poser can add friends to the post, example x and y are also joining
- when choosing the location the app must provide basic geo autocomplete for location search, or suggestion a spot that has been added to the global map (complete)

Feed

- Users can see all friends posts on the feed, sorting from newest first

Friends

- Users must be able to search for other users. (complete)
- Users must be able to send and accept friend requests. (complete)
- If a user searches for a user, and there account is friends only, they must be-friend in order to see their posts etc
- For friends, users get a notification if a friend has posted a future session.
- Users must be able to remove friends.
- Users must be able to view mutual friends.
- (This one is a big MAYBE) Users must be able to get friend suggestions (people you may know).
- Users must be able to block users from appearing in search/results.
- Users must be able to see a list of all friends. ( completed )

Spots & Map

- Users must be able to view global spots on a map. (complete)
- Users must be able to add a new global spot. (complete)
- Users must be able to open spot details from the map. (complete)
- Users must be able to see upcoming posts for a spot (time > now). (complete)
- Users must be able to search spots by name/type.
- Add photos to a spot, displayed in the descritpsion
- Users must be able to filter spots by sport type.
- The map must show the user’s current location.(complete)
- Data quality: duplicate spot detection.
- Users can suggest edits to make to a spot to the owner of the spot; the owner or admins can choose to take this on board
- implement a scoreing score to users, it will be like Wikipedia, where people earn points for adding or updating spots, and after a certain amount of scores you get admin permissions.
- to deal with inaccuraties, after x amount of flags the spot is set-up for review by an admin.
- Comments can be added to each spot, can rate the spot 1-5 star, Photos can be added to the spot.
- A spot becomes verified when there are x amount of comments, or reviews

Offline

- To be able to view certain things when in offline mode.

Location Search

- The app must provide basic geo autocomplete for location search. (complete)

Privacy

- Users must be able to set their profile visibility (public, friends-only, private).
- Users must be able to control who can view their posts (public/friends-only/private).
- Users must be able to block other users.
- The app must not display posts from blocked users.
- The app must allow users to delete their data (posts, comments, profile).
- Users must be able to set a post to friends-only or select specific people.

Roles & permissions

- Admin/moderator for spots and reports.

Notifications

- reminders for upcoming sessions, new comments, friend requests, friend posts etc
- push notifications on to nofity user if a spot is kiteable with current forcast

Analytics

- basic usage tracking, i.e you can see how many sessions you have posted a year, month etc

Wind, tides, & Kiteability Forecast

- When creating a spot, users can define the kiteable wind direction range for that spot.
- The app must fetch wind forecast data for a spot using a weather API.
- The app must calculate whether a spot is kiteable for a given day/time based on wind direction and speed.
- While creating the spot too, users have the option to say if it is tidal or not. If it is not tidal then it does not take tides into account. However if it is tidal, the spot will pull tides in the area and say if it is near high or low tide.

Strava sessions

- Import strava sessions, and if these sessions are linked to the same location as a spot on the global map, it will be added to the spot, which will be displayed in spot details
- If you plan a session, and then after the sessions you can import that session and link it to the planned session for reputation points.
