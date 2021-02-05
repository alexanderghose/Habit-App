const User = require('../models/user');

module.exports = {
  index,
  addRole,
  delRole,
  roleDetail,
  addHabit,
  delHabit,
  habitDetail,
  editHabit,
  showHabits,
  addTask,
  delTask,
  showTasks,
  showAll,
  completeHabit,
  incompleteHabit,
  resetHabits,
  setUTCOffset,
};

function index(req, res, next) {
  console.log(req.query)
  // Make the query object to use with Student.find based up
  // the user has submitted the search form or now
  let modelQuery = req.query.name ? {name: new RegExp(req.query.name, 'i')} : {};
  // Default to sorting by name
  let sortKey = req.query.sort || 'name';
  User.find(modelQuery)
  .sort(sortKey).exec(function(err, users) {
    if (err) return next(err);
    // Passing search values, name & sortKey, for use in the EJS
    res.render('users/index', {
        users,
        user: req.user,
        name: req.query.name,
        sortKey
      });
    });
  }

function addRole(req, res, next) {
    req.user.roles.push(req.body);
    req.user.save(function(err) {
      res.redirect('/users');
    });
}

function delRole(req, res, next) {
    console.log(req.user.roles);
    const idx = req.user.roles.findIndex(role => role.id === req.params.id);
    console.log(idx);
    req.user.roles.splice(idx, 1);
    req.user.save(function(err) {
        res.redirect('/users');
      });
}

function roleDetail(req, res, next) {
    req.user.roles.forEach(function(role) {
        if(role.id == req.params.id) {
            res.render('users/role', {role, user:req.user, calculateStreak: calculateStreak});
        }
    }); 
}

function addHabit(req, res, next) {
    req.user.roles.forEach(function(role) {
        if(role.id == req.params.id) {
            role.habits.push({name: req.body.habitName,
                            amount: req.body.habitAmount,
                            daily: req.body.habitDaily});
        }
    }); 
    req.user.save(function(err) {
        res.redirect('/users/role/' + req.params.id);
    });
}

function delHabit(req, res, next) {
    let roleID = "";
    req.user.roles.forEach(function(role) {
        console.log(role);
        const idx = role.habits.findIndex(habit => habit.id === req.params.id);
        console.log(idx);
        if(idx != -1) {
            role.habits.splice(idx, 1);
            roleID = role.id;
        }
    });
    req.user.save(function(err) {
        res.redirect('/users/role/' + roleID);
    });
}

function habitDetail(req, res, next) {
    req.user.roles.forEach(function(role) {
        role.habits.forEach(function(habit) {
            if(habit.id == req.params.id) {
                res.render('users/habit', {
                    user:req.user,
                    role, 
                    habit,
                    calculateStreak: calculateStreak,
                });
            }
        });
    });
}

// calculate streak if given an array of dates in chronological order - ie., [5 days ago, 2 days ago, today]
function calculateStreak(dates, user_utc_offset) {
    let current_date = new Date()
    
    // calculating streaks involves comparing the "completed" dates against today.
    // but midnight server time (eg., UTC time for heroku) may not match midnight of the user's time
    // For example, if I, the user, am at GMT-5, then our server is in the FUTURE by 5 hours. That is:
    //  if I do an activity earlier today, say, at 12am, and then check for streaks later in the day, the time matters:
    //  if i check for streaks between 7pm-11:59pm, i expect a streak of 1 but server will show 0
    //           because the server thinks we're at tomorrow already, so will show a streak of 0 (srv sees 12am-459am)
    // if i check for streaks between 12am-6:59pm, i expect a streak of 1 and server will show 1 (srv sees 5am-11:59pm)
    // ie., from the server's POV, if our user is behind UTC by an offset of -5, we must do this:
    // if server time is in the interval [12am, 4:59am], srv should pretend today is yesterday for streak calculation
    // if server time is in the interval [5am, 11:59pm], srv should consider today to be today
    if (user_utc_offset < 0) { // user is GMT-1 to GMT-12
        let today_at_0_00 = new Date(current_date.getFullYear(), current_date.getMonth(), current_date.getDate(), 0, 0);
        let today_at_5_00_am = new Date(current_date.getFullYear(), current_date.getMonth(), current_date.getDate(), -1*user_utc_offset, 0);
        let today_at_11_59pm = new Date(current_date.getFullYear(), current_date.getMonth(), current_date.getDate(), 23, 59);
        if (current_date >= today_at_0_00 && current_date < today_at_5_00_am) {
            current_date.setDate(current_date.getDate() - 1) // go back in time one day.
            current_date.setHours(0,0,0,0)
        } else if (current_date >= today_at_5_00_am && current_date < today_at_11_59pm) {
            current_date.setHours(0,0,0,0)
        }
    } else { // TODO: if user is GMT+1 to GMT+12, put in the correct calculation for europe and asia!
        current_date.setHours(0,0,0,0)
    }
    
    let streak = 0
    for (let i = dates.length -1; i >= 0; i--) {
        while(i >= 0 && dates[i].getTime() == current_date.getTime()) {
            streak++
            i--
            current_date.setDate(current_date.getDate() - 1)
        }
    }
    return Math.max(0, streak);
}

function editHabit(req, res, next) {
    let roleID = "";
    req.user.roles.forEach(function(role) {
        role.habits.forEach(function(habit) {
            const idx = role.habits.findIndex(habit => habit.id === req.params.id);
            if(habit.id === req.params.id) {
                roleID = role.id;
                habit.name = req.body.habitName
                habit.amount = req.body.habitAmount
                habit.daily = req.body.habitDaily
                req.user.save(function(err) {
                    res.redirect('/users/role/' + roleID);
                });
            }
        });
    });
}

function completeHabit(req, res, next) {
    req.user.roles.forEach(function(role) {
        role.habits.forEach(function(habit) {
            const idx = role.habits.findIndex(habit => habit.id === req.params.id);
            if(habit.id === req.params.id) {
                console.log(habit.completed);
                habit.completed = true;
                let today_right_now = new Date()

                // logging the correct date is an interesting process, assuming our server is in UTC time. 
                // For example, if i'm i'm GMT-5 right now, then our server is in the FUTURE by 5 hours. That is:
                // when i log an activity from 7pm-11:59pm, i expect it to show up as TODAY but it shows up as TOMORROW (server sees 12am-459am)
                // when i log an activity from 12am-6:59pm, i expect it to show up as TODAY and it shows up as TODAY (server sees 5am-11:59pm)
                // Rephrasing from the server's point of view: if our user is behind UTC time by an OFFSET of -5, we must do this:
                //     if server time is in the interval [12am, 5 am), i will put in yesterday's date
                //     else if server time is in the interval [5 am, 11:59pm], i will put in today's date
                if (req.user.UTC_offset_in_hours < 0) {
                    let today_at_0_00 = new Date(today_right_now.getFullYear(), today_right_now.getMonth(), today_right_now.getDate(), 0, 0);
                    let today_at_5_00_am = new Date(today_right_now.getFullYear(), today_right_now.getMonth(), today_right_now.getDate(), -1*req.user.UTC_offset_in_hours, 0);
                    let today_at_11_59pm = new Date(today_right_now.getFullYear(), today_right_now.getMonth(), today_right_now.getDate(), 23, 59);
                    if (today_right_now >= today_at_0_00 && today_right_now < today_at_5_00_am) {
                        today_right_now.setDate(today_right_now.getDate() - 1) // go back in time one day.
                        today_right_now.setHours(0,0,0,0)
                    } else if (today_right_now >= today_at_5_00_am && today_right_now < today_at_11_59pm) {
                        today_right_now.setHours(0,0,0,0)
                    }
                } else {
                    today_right_now.setHours(0,0,0,0)
                } // TODO: put in an else if for GMT > 0 .. eg., if we're ever in europe or asia
                
                today_exists_in_log = habit.completed_dates.some(date_in_log => date_in_log.getTime() == today_right_now.getTime())
                if (!today_exists_in_log) {
                    habit.completed_dates.push(today_right_now);
                }

                console.log(habit.completed);
                req.user.save(function(err) {
                    res.redirect(req.get("referer"));
                });
            }
        });
    });
}

function incompleteHabit(req, res, next) {
    req.user.roles.forEach(function(role) {
        role.habits.forEach(function(habit) {
            const idx = role.habits.findIndex(habit => habit.id === req.params.id);
            if(habit.id === req.params.id) {
                console.log(req.path);
                habit.completed = false;
                req.user.save(function(err) {
                    res.redirect(req.get("referer"));
                });
            }
        });
    });
}

function resetHabits(req, res, next) {
    req.user.roles.forEach(function(role) {
        role.habits.forEach(function(habit) {
                console.log(habit.completed);
                habit.completed = false;
                console.log(habit.completed);
        });
    });
    req.user.save(function(err) {
        res.redirect('/users');
    });
}

function showHabits(req, res, next) {
    let person = req.user;
    res.render('users/habits', {
        user:req.user,
        person,
        calculateStreak: calculateStreak,
    });
}



function addTask(req, res, next) {
    console.log("before");
    console.log(req.params.id);
    req.user.roles.forEach(function(role) {
        if(role.id == req.params.id) {
            role.tasks.push({name: req.body.taskName});
        }
    }); 
    req.user.save(function(err) {
        res.redirect('/users/role/' + req.params.id);
    });
}

function delTask(req, res, next) {
    let roleID = "";
    req.user.roles.forEach(function(role) {
        const idx = role.tasks.findIndex(task => task.id === req.params.id);
        console.log(idx);
        if(idx != -1) {
            roleID = role.id;
            role.tasks.splice(idx, 1);
        }
    });
    req.user.save(function(err) {
        res.redirect('/users/role/' + roleID);
    });
}

function showTasks(req, res, next) {
    let person = req.user;
    res.render('users/tasks', {person, user:req.user});
}

function showAll(req, res, next) {
    let person = req.user;
    res.render('users/all', {
        user:req.user,
        person,
        calculateStreak: calculateStreak,
    });
}

function setUTCOffset(req, res, next) {
    let person = req.user;
    console.log("received offset",req.body)
    req.user.UTC_offset_in_hours = parseInt(req.body.offset)*-1;
    req.user.save(function(err) {
        if(err) return res.json("something went wrong")
        res.json({"server_says":"ok user timezone set to "+req.body.offset})
    });
}