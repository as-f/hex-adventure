use prelude::*;
use world::ai;
use world::mob;

impl World {
    pub fn tick(&mut self) {
        self.update_fov();
        self.player.guard_recovery = 0;
        mob::for_each_mut(self, |mob_id, world| {
            if world[mob_id].alive {
                ai::act(mob_id, world).unwrap();
                world[mob_id].guard_recovery = 0;
            }
        });
    }
}
